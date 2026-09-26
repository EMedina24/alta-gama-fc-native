/**
 * The pitch camera's live state, its settling animations and its gestures
 * (ADR 0216).
 *
 * Every camera number is a Reanimated shared value, so a finger moves the
 * plane and all eleven tokens on the UI thread with no React render per
 * frame. The persisted view (`flat`, `flatRot`, `rotZ`, `tiltX`) is the
 * TARGET: when it changes — a toggle, a Flip, a Reset, a gesture's own end —
 * the values ease to it over `XiMotion.plane` on the kit's curve.
 *
 * ⚠⚠ **Persisted on gesture END only**, through `onCameraEnd`. A write per
 * frame would serialise the whole XI store sixty times a second.
 *
 * ⚠ Rotation eases to the NEAREST equivalent angle: a stored 0° reached from
 * 350° turns 10°, not back through 350°.
 *
 * ⚠ Reduce Motion: `ReduceMotion.System` on every timing, so the settle jumps
 * to its end and nothing else changes. Gestures still track the finger — that
 * is direct manipulation, not motion.
 */
import { useEffect, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  ReduceMotion,
  runOnJS,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Ease, XiMotion } from '@/constants/theme';
import { CAMERA, clampPan, planeCentre, planeFit, planeUnit, type PlaneView } from '@/features/starting-xi/projection';

export interface PitchCamera {
  w: SharedValue<number>;
  h: SharedValue<number>;
  unit: SharedValue<number>;
  base: SharedValue<number>;
  zoom: SharedValue<number>;
  panX: SharedValue<number>;
  panY: SharedValue<number>;
  centre: SharedValue<number>;
  tilt: SharedValue<number>;
  rot: SharedValue<number>;
  /** 0 flat → 1 in 3D: how far a token stands up off its anchor. */
  lift: SharedValue<number>;
}

export interface CameraInputs {
  w: number;
  h: number;
  flat: boolean;
  flatRot: 0 | 180;
  rotZ: number;
  tiltX: number;
  onCameraEnd: (patch: { rotZ: number; tiltX: number }) => void;
  onGestured: () => void;
}

const EASE = Easing.bezier(Ease.kit[0], Ease.kit[1], Ease.kit[2], Ease.kit[3]);

function ease(value: number) {
  'worklet';
  return withTiming(value, { duration: XiMotion.plane, easing: EASE, reduceMotion: ReduceMotion.System });
}

/** `target`, shifted by whole turns to the equivalent nearest `current`. */
function nearestTurn(current: number, target: number): number {
  return target + 360 * Math.round((current - target) / 360);
}

/** The camera as a worklet can read it. */
export function readView(c: PitchCamera): PlaneView {
  'worklet';
  return {
    w: c.w.value,
    h: c.h.value,
    unit: c.unit.value,
    scale: c.base.value * c.zoom.value,
    panX: c.panX.value,
    panY: c.panY.value,
    centre: c.centre.value,
    tilt: c.tilt.value,
    rot: c.rot.value,
  };
}

export function usePitchCamera(inputs: CameraInputs) {
  const { w, h, flat, flatRot, rotZ, tiltX, onCameraEnd, onGestured } = inputs;
  // ⚠ One `const` per shared value, written through that const: the React
  // Compiler knows a `useSharedValue` result is mutable, but not the same value
  // re-read out of an object literal.
  const wSV = useSharedValue(0);
  const hSV = useSharedValue(0);
  const unitSV = useSharedValue(0);
  const base = useSharedValue(0);
  const zoom = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const centre = useSharedValue<number>(flat ? CAMERA.centreFlat : CAMERA.centre3d);
  const tilt = useSharedValue<number>(flat ? 0 : tiltX);
  const rot = useSharedValue<number>(flat ? flatRot : rotZ);
  const lift = useSharedValue<number>(flat ? 0 : 1);
  const camera: PitchCamera = { w: wSV, h: hSV, unit: unitSV, base, zoom, panX, panY, centre, tilt, rot, lift };
  const [zoomPct, setZoomPct] = useState(100);
  const lastGestureEnd = useRef(0);
  const laidOut = useRef(false);

  // The box and the view it should be showing. ⚠ Shared values only — no
  // setState in here (the lint baseline).
  useEffect(() => {
    if (w <= 0 || h <= 0) return;
    wSV.value = w;
    hSV.value = h;
    unitSV.value = planeUnit(w);
    const fit = planeFit(w, h, flat);
    const turn = nearestTurn(rot.value, flat ? flatRot : rotZ);
    const middle = planeCentre(h, fit, flat);
    if (!laidOut.current) {
      // First layout: be there already, no settle from zero.
      laidOut.current = true;
      base.value = fit;
      centre.value = middle;
      rot.value = turn;
      return;
    }
    base.value = ease(fit);
    centre.value = ease(middle);
    tilt.value = ease(flat ? 0 : tiltX);
    rot.value = ease(turn);
    lift.value = ease(flat ? 0 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable
  }, [w, h, flat, flatRot, rotZ, tiltX]);

  // Switching between flat and 3D resets zoom and pan (the handoff's rule).
  const lastFlat = useRef(flat);
  useEffect(() => {
    if (lastFlat.current === flat) return;
    lastFlat.current = flat;
    zoom.value = ease(1);
    panX.value = ease(0);
    panY.value = ease(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable
  }, [flat]);

  const handleEnd = (rotation: number, tiltNow: number, zoomNow: number) => {
    lastGestureEnd.current = Date.now();
    setZoomPct(Math.round(zoomNow * 100));
    if (!flat) onCameraEnd({ rotZ: rotation, tiltX: Math.round(tiltNow * 10) / 10 });
    onGestured();
  };

  // ⚠ `.set()` in the closures that leave this hook — Reanimated's
  // React-Compiler-safe write. A bare `.value =` inside a closure the hook
  // returns reads to the compiler as mutating a frozen value.
  const settle = () => {
    'worklet';
    const home = zoom.value <= CAMERA.zoomSnap;
    if (home) {
      zoom.set(ease(1));
      panX.set(ease(0));
      panY.set(ease(0));
    }
    runOnJS(handleEnd)(rot.value, tilt.value, home ? 1 : zoom.value);
  };

  const start = useSharedValue({ rot: 0, tilt: 0, zoom: 1, panX: 0, panY: 0, fx: 0, fy: 0 });

  /**
   * The camera's three gestures, simultaneous. ⚠ Built by a function the
   * pitch calls in its JSX, as `board-stack`'s card drag is: the writers stay
   * next to the shared values they write (`react-hooks/immutability`).
   */
  const makeGesture = () => {

    const pan = Gesture.Pan()
      .minDistance(CAMERA.minMove)
      .maxPointers(1)
      .onStart(() => {
        start.value = { ...start.value, rot: rot.value, tilt: tilt.value, panX: panX.value, panY: panY.value };
      })
      .onUpdate((e) => {
        if (flat) {
          if (zoom.value <= CAMERA.zoomSnap) return;
          const p = clampPan(zoom.value, start.value.panX + e.translationX, start.value.panY + e.translationY);
          panX.value = p.x;
          panY.value = p.y;
          return;
        }
        rot.value = start.value.rot + e.translationX * CAMERA.spinPerPt;
        tilt.value = Math.min(
          CAMERA.tiltMax,
          Math.max(CAMERA.tiltMin, start.value.tilt - e.translationY * CAMERA.tiltPerPt),
        );
      })
      .onEnd(settle);

    const pinch = Gesture.Pinch()
      .onStart((e) => {
        start.value = { ...start.value, zoom: zoom.value, panX: panX.value, panY: panY.value, fx: e.focalX, fy: e.focalY };
      })
      .onUpdate((e) => {
        const z = Math.min(CAMERA.zoomMax, Math.max(CAMERA.zoomMin, start.value.zoom * e.scale));
        zoom.value = z;
        const p = clampPan(
          z,
          start.value.panX + (e.focalX - start.value.fx),
          start.value.panY + (e.focalY - start.value.fy),
        );
        panX.value = p.x;
        panY.value = p.y;
      })
      .onEnd(settle);

    const twist = Gesture.Rotation()
      .enabled(!flat)
      .onStart(() => {
        start.value = { ...start.value, rot: rot.value };
      })
      .onUpdate((e) => {
        rot.value = start.value.rot + (e.rotation * 180) / Math.PI;
      })
      .onEnd(settle);

    return Gesture.Simultaneous(pan, pinch, twist);
  };

  /** Zoom and pan home. The screen resets the stored angles alongside. */
  const resetZoom = () => {
    zoom.set(ease(1));
    panX.set(ease(0));
    panY.set(ease(0));
    setZoomPct(100);
  };

  /** A tap this soon after a gesture is the gesture's tail, not a pick. */
  const tapIsGestureTail = () => Date.now() - lastGestureEnd.current < XiMotion.tapGuard;

  return { camera, makeGesture, zoomPct, resetZoom, tapIsGestureTail };
}
