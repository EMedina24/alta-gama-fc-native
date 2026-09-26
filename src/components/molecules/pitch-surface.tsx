/**
 * The export card's pitch: turf ground, stripes and furniture (ADR 0065).
 *
 * Every measure is proportional to the box, so the sheet's preview and the
 * 1080-px capture draw the same pitch. Furniture is `react-native-svg`
 * (touchline, halfway line, centre circle and spot, both boxes and six-yard
 * boxes) transcribed from `handoff_squad-builder/Starting XI.dc.html`.
 *
 * ⚠ **Turf only, since ADR 0213.** The Lines and Angled looks belonged to the
 * first builder's on-screen board; the live pitch is now `PitchPlane`, and
 * the card was always drawn flat and green ("green reads as a pitch at
 * feed-thumbnail size", the 2026-08-22 product call).
 *
 * ⚠ Children are the slots; they render ABOVE the furniture inside the same box.
 */
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export interface PitchSurfaceProps {
  width: number;
  height: number;
  borderRadius: number;
  children?: ReactNode;
}

/** The stripe pitch (34pt on the 424pt phone pitch) as a fraction of height. */
const STRIPE = 34 / 424;
/** Touchline inset (12pt on 361 × 424) as a fraction of width. */
const INSET = 12 / 361;

export function PitchSurface({ width, height, borderRadius, children }: PitchSurfaceProps) {
  const ground = Colors.dark.pitchTurf;
  const line = Colors.dark.pitchLineTurf;
  const stripe = Colors.dark.pitchStripeTurf;

  const inset = INSET * width;
  const stroke = Math.max(1, 1.5 * (width / 361));
  const stripeH = STRIPE * height;
  const stripes = Math.ceil(height / (stripeH * 2));

  const cx = width / 2;
  const cy = height / 2;
  const circleR = (42 / 361) * width;
  const boxW = (150 / 361) * width;
  const boxH = (52 / 424) * height;
  const sixW = (70 / 361) * width;
  const sixH = (20 / 424) * height;

  return (
    <View style={[styles.box, { width, height, borderRadius, backgroundColor: ground }]}>
      {Array.from({ length: stripes }, (_, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[styles.stripe, { top: i * stripeH * 2, height: stripeH, backgroundColor: stripe }]}
        />
      ))}
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
