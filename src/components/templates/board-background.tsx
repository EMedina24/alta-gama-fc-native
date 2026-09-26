/**
 * The reader's background pick, drawn two ways (ADR 0208):
 *
 * - `backgroundTiles` — the pick STRIP's tiles, each with its mark. Shared by
 *   the Board's edit panel (ADR 0199) and Settings' Appearance group, so a
 *   tile cannot look one way in one place and another in the other.
 * - `BackgroundScene` — the pick as a PAGE GROUND. Settings wears it, so
 *   choosing a tile there repaints the page behind the strip — the preview is
 *   the page itself.
 *
 * ⚠ A TEMPLATE because both need `ART_MARK`, the league marks, which live with
 * the screen scaffold; the molecules and organisms under it may not import it
 * (ADR 0013, downward only).
 *
 * ⚠ Pure given its inputs: the route resolves the club (`useTeams`) and the
 * league's lockup (`useLeagueArtwork`) and passes them in.
 */
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Crest, LimeGlow, PlusGlyph, SceneGround } from '@/components/atoms';
import type { SceneTileStripItem } from '@/components/molecules';
import { BoardEdit, ClubScene, LeagueScene, Size } from '@/constants/theme';
import type { BackgroundOption } from '@/features/board/background-options';
import { crestSrc } from '@/lib/cronogol/derive';
import { clubSceneTheme, leagueSceneTheme } from '@/lib/cronogol/league-theme';
import type { League } from '@/lib/cronogol/leagues';
import type { TeamView } from '@/lib/cronogol/types';

import { ART_MARK } from './screen-scaffold';

/** A tile's watermark: the club's crest bled left, or the league's own mark. */
function tileMark(option: BackgroundOption): ReactNode {
  if (option.crestFallback !== undefined) {
    return (
      <View style={styles.tileCrest}>
        <Crest src={option.crest} fallback={option.crestFallback} size={BoardEdit.tileMark} />
      </View>
    );
  }
  if (option.art) {
    const Mark = ART_MARK[option.art];
    return <Mark height={BoardEdit.tileMark} alpha={BoardEdit.tileMarkAlpha} />;
  }
  return undefined;
}

export interface BackgroundTilesInput {
  options: readonly BackgroundOption[];
  /** The last tile, which opens the full catalogue sheet. */
  moreLabel: string;
  /** VoiceOver's name for a tile — `copy.board.backgroundTile`. */
  tileLabel: (label: string) => string;
  onPick: (id: string) => void;
  onMore: () => void;
}

export function backgroundTiles({
  options,
  moreLabel,
  tileLabel,
  onPick,
  onMore,
}: BackgroundTilesInput): SceneTileStripItem[] {
  return [
    ...options.map((option) => ({
      key: option.id,
      label: option.label,
      stops: option.stops,
      mark: tileMark(option),
      markSide: option.art ? ('right' as const) : ('left' as const),
      selected: option.selected,
      accessibilityLabel: tileLabel(option.label),
      onPress: () => onPick(option.id),
    })),
    {
      key: 'more',
      label: moreLabel,
      icon: <PlusGlyph color="textSecondary" size={Size.moreGlyph} />,
      accessibilityLabel: moreLabel,
      onPress: onMore,
    },
  ];
}

export interface BackgroundSceneProps {
  /** The picked club, resolved against the catalogue. Wins over `league`. */
  team: TeamView | null;
  league: League | undefined;
  /** The league's wire lockup, when it has one — `leagueSceneLogo`. */
  leagueLogo: string | null;
}

/**
 * The pick as a page ground, behind a screen's scroll.
 *
 * - A club: the club page's scene (ADR 0202), crest top-left.
 * - A league: the league tabs' scene (ADR 0201), lockup top-right, or the
 *   bundled mark where the wire has no artwork.
 * - Otherwise — the brand default, or a club the catalogue cannot answer yet —
 *   the lime glow every plain stack screen wears. ⚠ That fallback NEVER writes
 *   the preference back: a slow catalogue must not reset the reader's pick.
 */
export function BackgroundScene({ team, league, leagueLogo }: BackgroundSceneProps) {
  if (team) {
    const scene = clubSceneTheme(team);
    const crest = crestSrc(team.logoUrls, team.logoUrl, 'hero');
    return (
      <SceneGround
        kind="club"
        base={scene.base}
        glow={scene.glow}
        mark={
          crest ? (
            <Image
              source={{ uri: crest }}
              style={styles.clubMark}
              contentFit="contain"
              accessible={false}
            />
          ) : null
        }
      />
    );
  }

  const theme = league ? leagueSceneTheme(league.apiSlug) : null;
  if (theme) {
    const Mark = theme.art ? ART_MARK[theme.art] : null;
    const mark = leagueLogo ? (
      <Image
        source={{ uri: leagueLogo }}
        style={styles.leagueMark}
        contentFit="contain"
        accessible={false}
      />
    ) : Mark ? (
      <Mark height={LeagueScene.mark.width} alpha={LeagueScene.mark.alpha} />
    ) : null;
    return <SceneGround base={theme.base} glow={theme.glow} mark={mark} />;
  }

  return <LimeGlow />;
}

const styles = StyleSheet.create({
  tileCrest: { opacity: BoardEdit.tileMarkAlpha },
  clubMark: {
    width: ClubScene.mark.width,
    height: ClubScene.mark.width,
    opacity: ClubScene.mark.alpha,
  },
  leagueMark: {
    width: LeagueScene.mark.width,
    height: LeagueScene.mark.width,
    opacity: LeagueScene.mark.alpha,
  },
});
