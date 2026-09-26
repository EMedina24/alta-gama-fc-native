/**
 * The live pitch's surface — the plane the camera looks at (ADR 0213).
 *
 * A 520 × 800-unit plane drawn at `unit` points per unit: a dark translucent
 * fill so the club scene reads through it, ten bands of stripe, and the
 * handoff's markings verbatim (`viewBox 0 0 100 154`, stretched to the plane
 * with `preserveAspectRatio="none"`, exactly as the prototype draws them).
 *
 * ⚠ This view is TRANSFORMED — its parent applies the camera — so nothing that
 * must stay upright may live in it. Tokens and names are an overlay
 * (`organisms/xi-pitch/token-layer.tsx`); only things that lie ON the grass
 * (shadows, the placement ripple, the debug probe) are passed as `children`.
 *
 * ⚠ Paint, never glass: a glass surface under a transform is trap 64's cousin.
 */
import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Colors, Xi } from '@/constants/theme';

export interface PitchPlaneProps {
  /** Points per plane unit this view is laid out at. */
  unit: number;
  children?: ReactNode;
}

/** The handoff's ten bands: every other tenth is striped. */
const STRIPES = [0, 2, 4, 6, 8];

export function PitchPlane({ unit, children }: PitchPlaneProps) {
  const w = 520 * unit;
  const h = 800 * unit;
  const line = Colors.dark.xiPlaneLine;
  const gradient = `xi-plane-${useId().replace(/:/g, '')}`;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.plane,
        {
          width: w,
          height: h,
          borderRadius: Xi.planeRadius * unit,
          borderWidth: Math.max(StyleSheet.hairlineWidth, Xi.planeEdge * unit),
        },
      ]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} accessible={false}>
        <Defs>
          <LinearGradient id={gradient} x1={0} y1={0} x2={0} y2={1}>
            <Stop offset={0} stopColor={Colors.dark.xiWashInk} stopOpacity={Xi.wash.planeTop} />
            <Stop offset={1} stopColor={Colors.dark.xiWashInk} stopOpacity={Xi.wash.planeFoot} />
          </LinearGradient>
        </Defs>
        <Rect width={w} height={h} fill={`url(#${gradient})`} />
        {STRIPES.map((band) => (
          <Rect key={band} y={(band / 10) * h} width={w} height={h / 10} fill={Colors.dark.xiPlaneStripe} />
        ))}
      </Svg>
      <Svg
        width={w}
        height={h}
        viewBox="0 0 100 154"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        accessible={false}>
        <Rect x={1} y={1} width={98} height={152} rx={1.5} stroke={line} strokeWidth={0.4} fill="none" />
        <Line x1={1} y1={77} x2={99} y2={77} stroke={line} strokeWidth={0.4} />
        <Circle cx={50} cy={77} r={13.5} stroke={line} strokeWidth={0.4} fill="none" />
        <Circle cx={50} cy={77} r={0.8} fill={line} />
        <Rect x={20.3} y={1} width={59.4} height={24.3} stroke={line} strokeWidth={0.4} fill="none" />
        <Rect x={36.5} y={1} width={27} height={8.1} stroke={line} strokeWidth={0.4} fill="none" />
        <Rect x={20.3} y={128.7} width={59.4} height={24.3} stroke={line} strokeWidth={0.4} fill="none" />
        <Rect x={36.5} y={144.9} width={27} height={8.1} stroke={line} strokeWidth={0.4} fill="none" />
        <Path d="M 39 25.3 A 13.5 13.5 0 0 0 61 25.3" stroke={line} strokeWidth={0.4} fill="none" />
        <Path d="M 39 128.7 A 13.5 13.5 0 0 1 61 128.7" stroke={line} strokeWidth={0.4} fill="none" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  plane: {
    overflow: 'hidden',
    backgroundColor: Colors.dark.xiPlaneFill,
    borderColor: Colors.dark.hairlineStrong,
  },
});
