/**
 * The Medina background (ADR 0196): one lime pool, top-right — the kit's
 * `LimeGlow`, drawn through `MeshGround` so there is one pool renderer.
 *
 * Usage as `MeshGround`: first child of a screen's root `View`, BEHIND the
 * scroll view, never inside it, never on a sheet. Tab screens keep
 * `MeshGround` with their league pools (the scaffold draws it).
 */
import { LimeGlow as LimeGlowPools } from '@/constants/theme';

import { MeshGround } from './mesh-ground';

export function LimeGlow() {
  return <MeshGround pools={LimeGlowPools} />;
}
