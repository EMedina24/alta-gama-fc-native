/**
 * The aurora mesh (ADR 0087): the app's one background layer — three static
 * colour pools on the `background` ground, drawn once per SCREEN.
 *
 * Usage: first child of a screen's root `View`, BEHIND the scroll view. Never
 * inside the scroll (the mesh does not move), never per card, and never on a
 * modal sheet (a sheet is `SHEET_GROUND` — system glass or opaque, ADR 0195).
 *
 * Since ADR 0196 the brand's three-pool `Mesh` is only the TAB screens' default
 * (via the scaffold's league theme); plain stack screens draw `LimeGlow`, which
 * is this component with the one-pool `LimeGlow` table.
 *
 * ⚠ One `Svg`, three `RadialGradient`s, ids from `useId()` — `finished-today`'s
 * hard-coded `"band"` id is the collision this avoids (trap 40). Translucency
 * rides `stopOpacity`, never an rgba stop colour (trap 42).
 *
 * ⚠ `pools` takes a LEAGUE's mesh (ADR 0164) and defaults to the brand's. The
 * default is the `Mesh` table itself, not a round-trip through `leagueMesh` at
 * the brand's own hue: pools 2 and 3 are teal and blue-teal, and re-hueing them
 * to the lime pool's hue would turn the page olive on every screen that has no
 * league.
 */
import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Mesh } from '@/constants/theme';
import type { MeshPool } from '@/lib/cronogol/league-theme';

export interface MeshGroundProps {
  /** The three pools to draw. Defaults to the brand's `Mesh`. */
  pools?: readonly MeshPool[];
}

export function MeshGround({ pools = Mesh }: MeshGroundProps = {}) {
  const base = useId().replace(/:/g, '');
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Defs>
        {pools.map((pool, i) => (
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
      {pools.map((_, i) => (
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
