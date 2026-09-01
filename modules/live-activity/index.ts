/**
 * The native seam for ActivityKit (ADR 0055/0057).
 *
 * ⚠ Import this ONLY from `src/features/push/capability.ts`. That file is the
 * app's one seam for everything the Apple Developer account and the OS gate, and
 * the whole point of it is that no screen ever learns whether a capability
 * exists — a screen changes preferences and the sync layer decides whether there
 * is anywhere to send them (ADR 0023).
 */
import { NativeModule, requireNativeModule } from 'expo';

export interface PushToStartTokenEvent {
  /** Lowercase hex. ⚠ NOT 64 characters — see `normaliseActivityToken`. */
  token: string;
}

type LiveActivityEvents = {
  onPushToStartToken: (event: PushToStartTokenEvent) => void;
};

declare class LiveActivityModule extends NativeModule<LiveActivityEvents> {
  /** iOS 18+ AND the reader's per-app Live Activities setting. Both are real. */
  isSupported(): boolean;
  /** ⚠ Null before the first emission, on a simulator, and below iOS 18. */
  getPushToStartToken(): string | null;
}

export default requireNativeModule<LiveActivityModule>('LiveActivity');
