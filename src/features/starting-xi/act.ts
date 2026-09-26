/**
 * One call-site pattern for every builder action (ADR 0211): apply it through
 * the store, then play the haptic its effect names (ADR 0215).
 *
 * The screen and all five sheets use this and nothing else to change an XI,
 * so an action cannot land without its feedback, or buzz without landing.
 */
import type { SquadPlayerView } from '@/lib/cronogol/types';
import { hapticFor } from '@/lib/haptics';
import { dispatchXi } from '@/store/starting-xi';

import type { SquadIndex, XiAction, XiEffect } from './xi-state';

export function actXi(slug: string, action: XiAction, squad: SquadIndex): XiEffect {
  const effect = dispatchXi(slug, action, squad);
  void hapticFor(effect);
  return effect;
}

/** The squad as the reducer reads it: id → band. */
export function squadIndex(players: readonly SquadPlayerView[]): SquadIndex {
  return new Map(players.map((p) => [p.id, { position: p.position }]));
}
