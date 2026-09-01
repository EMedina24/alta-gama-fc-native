/**
 * The aurora mesh (ADR 0087): the app's one background layer — three static
 * colour pools on the `background` ground, drawn once per SCREEN.
 *
 * Usage: first child of a screen's root `View`, BEHIND the scroll view. Never
 * inside the scroll (the mesh does not move), never per card, and never on a
 * modal sheet (ADR 0093 — sheets are opaque `sheetGround`; glass over a scrim
 * reads muddy).
 *
 * ⚠ One `Svg`, three `RadialGradient`s, ids from `useId()` — `finished-today`'s
 * hard-coded `"band"` id is the collision this avoids (trap 40). Translucency
 * rides `stopOpacity`, never an rgba stop colour (trap 42).
 */
import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Mesh } from '@/constants/theme';

export function MeshGround() {
  const base = useId().replace(/:/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Defs>
        {Mesh.map((pool, i) => (
          <RadialGradient
            key={`${base}-${i}`}
            id={`mesh-${base}-${i}`}
            cx={`${pool.cx * 100}%`}
            cy={`${pool.cy * 100}%`}
            rx={`${pool.rx * 100}%`}
            ry={`${pool.ry * 100}%`}>
            <Stop offset={0} stopColor={pool.color} stopOpacity={pool.alpha} />
            <Stop offset={pool.fade} stopColor={pool.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {Mesh.map((_, i) => (
        <Rect
          key={`${base}-${i}`}
          width="100%"
          height="100%"
          fill={`url(#mesh-${base}-${i})`}
        />
      ))}
    </Svg>
  );
}
