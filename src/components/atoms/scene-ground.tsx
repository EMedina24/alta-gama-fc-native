/**
 * The LEAGUE SCENE (ADR 0201) — the Medina kit's league background: the
 * league's dark tint washed down the screen, a vivid pool top-right, and the
 * league's lockup as a faint watermark.
 *
 * Usage as `MeshGround`: first child of a screen's root `View`, BEHIND the
 * scroll view. ⚠ It does not move — the header and the rows scroll over it,
 * which is what keeps the colour under the list rather than fading out with a
 * crown that has scrolled away.
 *
 * ⚠ Translucency rides stop OPACITY, never an rgba stop colour (trap 42) —
 * both layers are `WashGradient`/`WashRadial`, which only take it that way.
 *
 * ⚠ The mark is a NODE the caller builds (the wire's logo image, or a drawn
 * fallback) — an atom does not know which a league has. This places it.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { WashGradient, WashRadial } from './wash-gradient';
import { ClubScene, Colors, LeagueScene } from '@/constants/theme';

export interface SceneGroundProps {
  /** The league's dark tint — `leagueSceneTheme().base`. */
  base: string;
  /** The league's vivid tint — `leagueSceneTheme().glow`. */
  glow: string;
  /** The watermark, already sized and faded. Null draws none. */
  mark?: ReactNode;
  /**
   * The geometry: `league` (ADR 0201) lights the top-RIGHT and hangs the
   * lockup there; `club` (ADR 0202) lights the top-LEFT and hangs the crest
   * behind the hero. Same wash, same base lightness.
   */
  kind?: 'league' | 'club';
}

const GROUND = Colors.dark.background;

export function SceneGround({ base, glow, mark, kind = 'league' }: SceneGroundProps) {
  const wash = LeagueScene.wash.map((stop) =>
    'ground' in stop
      ? { offset: stop.offset, color: GROUND, opacity: 1 }
      : { offset: stop.offset, color: base, opacity: stop.opacity },
  );
  const g = kind === 'club' ? ClubScene.glow : LeagueScene.glow;

  return (
    <View style={styles.scene} pointerEvents="none" accessible={false}>
      <WashGradient angle="vertical" stops={wash} />
      <WashRadial
        cx={g.cx}
        cy={g.cy}
        rx={g.rx}
        ry={g.ry}
        stops={[
          { offset: 0, color: glow, opacity: g.alpha },
          { offset: g.fade, color: glow, opacity: 0 },
        ]}
      />
      {mark ? <View style={kind === 'club' ? styles.markClub : styles.mark}>{mark}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ⚠ `WashGradient`'s parent contract: positioned, and clipped — the mark
  // bleeds off the right edge, and the cut must be the screen's.
  scene: { ...StyleSheet.absoluteFill, backgroundColor: GROUND, overflow: 'hidden' },
  mark: {
    position: 'absolute',
    top: LeagueScene.mark.top,
    right: LeagueScene.mark.right,
    width: LeagueScene.mark.width,
    alignItems: 'center',
  },
  markClub: {
    position: 'absolute',
    top: ClubScene.mark.top,
    left: ClubScene.mark.left,
    width: ClubScene.mark.width,
    alignItems: 'center',
  },
});
