/**
 * The pitch: ground, stripes and furniture, per `look` (ADR 0065).
 *
 * Shared by the on-screen board and the export card at different sizes, so
 * every measure is proportional to the box. Furniture is `react-native-svg`
 * (touchline, halfway line, centre circle and spot, both boxes and six-yard
 * boxes) transcribed from `handoff_squad-builder/Starting XI.dc.html`.
 *
 * ⚠ Never applies the Angled tilt itself. The board wraps it in a
 * `perspective` + `rotateX`; the export card never tilts (decided 2026-08-29).
 * `angled` here only picks the lime stripe wash over the line-art ground.
 *
 * ⚠ Children are the slots; they render ABOVE the furniture inside the same box.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import type { Look } from '@/features/starting-xi/formations';

export interface PitchSurfaceProps {
  look: Look;
  width: number;
  height: number;
  borderRadius: number;
  children?: ReactNode;
}

/** The stripe pitch (34pt on the 424pt phone pitch) as a fraction of height. */
const STRIPE = 34 / 424;
/** Touchline inset (12pt on 361 × 424) as a fraction of width. */
const INSET = 12 / 361;

export function PitchSurface({ look, width, height, borderRadius, children }: PitchSurfaceProps) {
  const turf = look === 'turf';
  const ground = turf ? Colors.dark.pitchTurf : Colors.dark.pitchArt;
  const line = turf ? Colors.dark.pitchLineTurf : Colors.dark.pitchLineArt;
  const stripe = look === 'lines' ? null : turf ? Colors.dark.pitchStripeTurf : Colors.dark.pitchStripeArt;

  const inset = INSET * width;
  const stroke = Math.max(1, 1.5 * (width / 361));
  const stripeH = STRIPE * height;
  const stripes = stripe ? Math.ceil(height / (stripeH * 2)) : 0;

  const cx = width / 2;
  const cy = height / 2;
  const circleR = (42 / 361) * width;
  const boxW = (150 / 361) * width;
  const boxH = (52 / 424) * height;
  const sixW = (70 / 361) * width;
  const sixH = (20 / 424) * height;

  return (
    <View style={[styles.box, { width, height, borderRadius, backgroundColor: ground }]}>
      {stripe
        ? Array.from({ length: stripes }, (_, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[
                styles.stripe,
                { top: i * stripeH * 2, height: stripeH, backgroundColor: stripe },
              ]}
            />
          ))
        : null}
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessible={false}>
        <Rect
          x={inset}
          y={inset}
          width={width - inset * 2}
          height={height - inset * 2}
          rx={4 * (width / 361)}
          stroke={line}
          strokeWidth={stroke}
          fill="none"
        />
        <Path d={`M${inset} ${cy}H${width - inset}`} stroke={line} strokeWidth={stroke} />
        <Circle cx={cx} cy={cy} r={circleR} stroke={line} strokeWidth={stroke} fill="none" />
        <Circle cx={cx} cy={cy} r={2.5 * (width / 361)} fill={line} />
        {/* Far box + six-yard box (attack is up) */}
        <Path
          d={`M${cx - boxW / 2} ${inset}V${inset + boxH}H${cx + boxW / 2}V${inset}`}
          stroke={line}
          strokeWidth={stroke}
          fill="none"
        />
        <Path
          d={`M${cx - sixW / 2} ${inset}V${inset + sixH}H${cx + sixW / 2}V${inset}`}
          stroke={line}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Near box + six-yard box */}
        <Path
          d={`M${cx - boxW / 2} ${height - inset}V${height - inset - boxH}H${cx + boxW / 2}V${height - inset}`}
          stroke={line}
          strokeWidth={stroke}
          fill="none"
        />
        <Path
          d={`M${cx - sixW / 2} ${height - inset}V${height - inset - sixH}H${cx + sixW / 2}V${height - inset}`}
          stroke={line}
          strokeWidth={stroke}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', position: 'relative' },
  stripe: { position: 'absolute', left: 0, right: 0 },
});
