/**
 * Where the Supabase session lives: the iOS Keychain, via `expo-secure-store`.
 *
 * ⚠ **Not AsyncStorage, unlike `store/preferences.ts`.** A refresh token is a
 * long-lived credential, not a preference — it survives in the app container and
 * in unencrypted local backups, and it is the one value here that grants access
 * to somebody's account. The Keychain is what that belongs in.
 *
 * Two `SecureStore` constraints shape everything below, and both are silent
 * failures rather than loud ones.
 */
import * as SecureStore from 'expo-secure-store';

/**
 * ⚠ **`SecureStore` keys may only contain `[A-Za-z0-9._-]`** — a colon throws.
 * `AUTH_STORAGE_KEY` is `altagama:auth`, matching this app's other storage keys,
 * so it has to be mapped rather than renamed: the key is what sessions are filed
 * under and changing it signs everyone out.
 */
function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * ⚠ **`SecureStore` documents a 2048-byte limit per value**, warns today and
 * says it may throw in a future SDK. A Supabase session is a JWT plus a refresh
 * token plus the user object — routinely 2–4 KB — so it does not fit and must be
 * split.
 *
 * Measured in CHARACTERS against a BYTE limit, so the bound has to hold for the
 * worst case: 3 bytes per BMP character in UTF-8 (a surrogate pair is 2
 * characters for 4 bytes, which is cheaper). 600 × 3 = 1800 < 2048, with room to
 * spare. Names and email addresses in the user object are exactly where
 * non-ASCII shows up, so this is a real case, not a theoretical one.
 */
const CHUNK_CHARS = 600;

const countKey = (key: string) => `${safeKey(key)}.n`;
const chunkKey = (key: string, index: number) => `${safeKey(key)}.${index}`;

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const count = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

/**
 * The `supabase-js` storage interface. All three methods swallow their errors and
 * degrade to "no session" — a Keychain that cannot be reached must land the user
 * signed out, never crash the app on launch.
 */
export const SessionStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      const count = await readCount(key);
      if (count === 0) return null;

      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        // ⚠ A missing chunk means a torn write. Report "signed out" rather than
        // handing `supabase-js` a truncated JSON string — the parse would throw
        // somewhere far less legible than here.
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const previous = await readCount(key);

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_CHARS) {
        chunks.push(value.slice(i, i + CHUNK_CHARS));
      }

      /**
       * ⚠ **The count is deleted FIRST and written LAST, and that order is the
       * whole design.** It makes the count the commit marker: it exists only when
       * every chunk behind it does. A crash or a kill mid-write then reads back as
       * a clean "signed out" — one more sign-in — instead of a half-old,
       * half-new blob that parses into a session with somebody's stale token in it.
       */
      await SecureStore.deleteItemAsync(countKey(key));

      for (const [index, chunk] of chunks.entries()) {
        await SecureStore.setItemAsync(chunkKey(key, index), chunk);
      }
      // Stale tail from a longer previous session, so `getItem` cannot read past
      // the new end and `removeItem` cannot leave orphans behind.
      for (let i = chunks.length; i < previous; i += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }

      await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    } catch {
      // The session still holds in memory for this run; the next launch signs in.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const count = await readCount(key);
      // Count first again — a partial delete must not leave a marker claiming
      // chunks that are already gone.
      await SecureStore.deleteItemAsync(countKey(key));
      for (let i = 0; i < count; i += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, i));
      }
    } catch {
      // Nothing to do.
    }
  },
};
