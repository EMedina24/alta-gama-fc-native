/**
 * The pitch camera: one transform for the plane, the same transform for the
 * tokens (ADR 0213).
 *
 * The handoff's pitch is a CSS 3D scene — a parent with `perspective: 1400px;
 * perspective-origin: 50% 30%`, and a 520 × 800 plane under `translate(pan)
 * scale(s) rotateX(tilt) rotateZ(rot)`, its tokens counter-rotated children
 * (`preserve-3d`) so they face the viewer. React Native has no `preserve-3d`:
 * a child of a tilted view is flattened INTO it. So the plane (markings,
 * stripes, shadows) is the only thing drawn through the native transform, and
 * the tokens live in an UNROTATED overlay, each placed at `projectPoint` of its
 * slot — upright, sized by depth, and hit-testable exactly where it is drawn.
 * That only works if `projectPoint` IS the native transform, which is why both
 * are built from one op list here.
 *
 * ⚠⚠ **React Native's transform semantics, as read in its C++ (RN 0.86):**
 * - `BaseViewProps::resolveTransform` folds the list with `Transform::operator*`,
 *   which computes `rhs · lhs`, so the composed matrix is `op_n · … · op_1` and
 *   a ROW vector `p · M` meets the LAST op first — the same order as CSS.
 * - Translation lives in row 3 (`matrix[12..14]`); `perspective` sets
 *   `matrix[11] = -1/p`, CoreAnimation's `m34`. So `w' = w − z/p`.
 * - The origin is the layer's CENTRE (`anchorPoint` 0.5/0.5; `transformOrigin`
 *   unset).
 * - `{ scale }` scales Z too (`Transform::Scale(v, v, v)`); CSS `scale(s)` does
 *   not. **This module uses `scaleX` + `scaleY`**, or tilt would shorten under
 *   zoom where the handoff's does not.
 *
 * The CSS parent's `perspective-origin` has no RN equivalent (a transform has
 * no parent), so it is folded in as `translateY(o − H/2)` before the
 * perspective and `translateY(C − o)` after it — `T(o)·P·T(−o)·T(C)` with the
 * plane laid out at the scene's centre. The harness proves this op list equals
 * both a port of RN's `operator*` and a column-vector model of the CSS scene.
 *
 * Pure. Every function is a worklet so the plane's animated style and each
 * token's animated position can call it on the UI thread.
 */
import { PLANE_H, PLANE_W } from './pitch-geometry';

/**
 * The handoff's camera numbers (`handoff_lineup/README.md`, Layout §3 and
 * Gestures). Geometry, not paint — the paint lives in `@/constants/theme`.
 */
export const CAMERA = {
  /**
   * Perspective distance in plane UNITS — the CSS `perspective: 1400px`
   * against a plane that is 520 CSS px wide BEFORE its `scale()`. ⚠ CSS
   * `scale()` never touches z, so depth is measured in unscaled plane pixels;
   * on a plane laid out at `unit` points per unit that is `1400 × unit`
   * points. Using 1400 points instead makes the pitch ~35% flatter than the
   * handoff's — the harness's CSS model is what caught it.
   */
  perspective: 1400,
  /** `perspective-origin: 50% 30%`. */
  originY: 0.3,
  /**
   * Where the plane's centre sits, as a fraction of the scene height.
   *
   * ⚠ 3D is 0.53, not the handoff's 0.47: a standing token carries its name
   * ABOVE it, and at 47% the attackers' names rode up into the card's top bar
   * ("Raphinha" under "Flat", first build). The near end still clears the
   * card's foot with the bench open.
   */
  centreFlat: 0.5,
  centre3d: 0.53,
  /**
   * UNITS kept clear UNDER the flat plane: the keeper stands 72u from the
   * bottom edge and his name hangs below his token, so without this his name
   * is cut by the card (seen on the first build). Not the handoff's number —
   * its flat fit let the name fall off the plane.
   */
  flatReserve: 44,
  /** Tilt the 3D view opens at, and the range a drag may take it through. */
  tilt: 34,
  tiltMin: 14,
  tiltMax: 64,
  /** Degrees per point of one-finger drag. */
  spinPerPt: 0.4,
  tiltPerPt: 0.2,
  zoomMin: 0.7,
  zoomMax: 2.6,
  /** A release at or under this snaps home to 1. */
  zoomSnap: 1.01,
  /** Pan limit per unit of zoom past 1, in points; vertical takes 1.4×. */
  panPerZoom: 200,
  panYRatio: 1.4,
  /** A one-finger gesture counts once it has travelled this far. */
  minMove: 6,
} as const;

export interface PlaneView {
  /** The scene box, in points. The plane is laid out centred in it. */
  w: number;
  h: number;
  /** Points per plane unit the plane VIEW is laid out at (width-fitted). */
  unit: number;
  /** Points per plane unit ON SCREEN before perspective — `base × zoom`. */
  scale: number;
  panX: number;
  panY: number;
  /** Plane centre as a fraction of `h` — `CAMERA.centreFlat` … `centre3d`. */
  centre: number;
  /** Degrees. 0 is flat. */
  tilt: number;
  /** Degrees about the plane's normal. */
  rot: number;
}

/** A transform op in React Native's own vocabulary. */
export type PlaneOp =
  | { translateX: number }
  | { translateY: number }
  | { perspective: number }
  | { scaleX: number }
  | { scaleY: number }
  | { rotateX: string }
  | { rotateZ: string };

/**
 * The plane view's `transform`, first op outermost. ⚠ Keep in step with
 * `projectPoint` — the harness compares them, the screen does not.
 */
export function planeOps(v: PlaneView): PlaneOp[] {
  'worklet';
  const k = v.unit > 0 ? v.scale / v.unit : 1;
  const originY = CAMERA.originY * v.h;
  return [
    { translateY: originY - v.h / 2 },
    { perspective: CAMERA.perspective * (v.unit > 0 ? v.unit : 1) },
    { translateX: v.panX },
    { translateY: v.panY + v.centre * v.h - originY },
    { scaleX: k },
    { scaleY: k },
    { rotateX: `${v.tilt}deg` },
    { rotateZ: `${v.rot}deg` },
  ];
}

export interface Projected {
  /** Scene-box points. */
  x: number;
  y: number;
  /** Perspective factor at this point: 1 in flat, < 1 receding, > 1 near. */
  depth: number;
}

/**
 * Where plane point (`ux`, `uy`) — units, top-down — lands in the scene box.
 * The same ops as `planeOps`, applied to a row vector last op first.
 */
export function projectPoint(v: PlaneView, ux: number, uy: number): Projected {
  'worklet';
  const k = v.unit > 0 ? v.scale / v.unit : 1;
  const originY = CAMERA.originY * v.h;
  const rz = (v.rot * Math.PI) / 180;
  const rx = (v.tilt * Math.PI) / 180;

  // The point relative to the plane view's centre, in its layout points.
  let x = (ux - PLANE_W / 2) * v.unit;
  let y = (uy - PLANE_H / 2) * v.unit;
  let z = 0;
  let w = 1;

  // rotateZ
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  const x1 = x * cz - y * sz;
  const y1 = x * sz + y * cz;
  x = x1;
  y = y1;
  // rotateX
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const y2 = y * cx - z * sx;
  const z2 = y * sx + z * cx;
  y = y2;
  z = z2;
  // scaleY, scaleX
  y *= k;
  x *= k;
  // translateY, translateX
  y += w * (v.panY + v.centre * v.h - originY);
  x += w * v.panX;
  // perspective
  w = w - z / (CAMERA.perspective * (v.unit > 0 ? v.unit : 1));
  // translateY
  y += w * (originY - v.h / 2);

  const iw = 1 / w;
  return { x: v.w / 2 + x * iw, y: v.h / 2 + y * iw, depth: iw };
}

/**
 * The plane's resting scale — points per unit — for a scene box. The
 * handoff's two fits: flat is portrait-fitted with a small margin, 3D is
 * allowed to overhang the box a little because the far end recedes.
 */
export function planeFit(w: number, h: number, flat: boolean): number {
  'worklet';
  if (w <= 0 || h <= 0) return 0;
  return flat
    ? Math.min((h - 28) / (PLANE_H + CAMERA.flatReserve), (w - 20) / PLANE_W)
    : Math.min((h + 40) / 760, w / 540);
}

/**
 * Where the plane's centre rests, as a fraction of the box height: flat, it
 * rides up by half the name reserve so the reserve lands at the BOTTOM; 3D is
 * the handoff's 47%.
 */
export function planeCentre(h: number, fit: number, flat: boolean): number {
  'worklet';
  if (!flat) return CAMERA.centre3d;
  return h > 0 ? CAMERA.centreFlat - (CAMERA.flatReserve * fit) / (2 * h) : CAMERA.centreFlat;
}

/**
 * The layout scale the plane VIEW is drawn at. Width-only, so opening the
 * bench (which shortens the box) animates `scale` and never re-lays out the
 * SVG.
 */
export function planeUnit(w: number): number {
  'worklet';
  return w > 20 ? (w - 20) / PLANE_W : 0;
}

/** The pan limits at a zoom, in points. */
export function clampPan(zoom: number, x: number, y: number): { x: number; y: number } {
  'worklet';
  const lim = Math.max(0, zoom - 1) * CAMERA.panPerZoom;
  const limY = lim * CAMERA.panYRatio;
  return { x: Math.min(lim, Math.max(-lim, x)), y: Math.min(limY, Math.max(-limY, y)) };
}
