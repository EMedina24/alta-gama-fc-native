/**
 * Plain-node harness for `store/preferences.ts`'s equality rule (ADR 0166).
 *
 * Run: `node scripts/preferences-harness.mjs`.
 *
 * It exists because of a bug that shipped and was invisible to every other
 * check. `commit` gates BOTH the snapshot swap and the `emit` on
 * `!same(snapshot, next)`, and `same` was a hand-written list of every field.
 * `leagueSlug` was added to `Preferences` (ADR 0164) and not to that list, so a
 * payload where only the league had moved compared EQUAL:
 *
 *   - the in-memory snapshot was never replaced,
 *   - no listener was ever notified,
 *   - and the new value was still written to AsyncStorage.
 *
 * So the league switcher did nothing on screen and the pick appeared only after
 * the next launch. ⚠ `tsc` cannot catch it — the list is exhaustive by
 * convention, not by type — and a screenshot cannot either, because the value
 * IS persisted. Only an assertion over the fields can.
 *
 * The rule asserted: **a payload differing in ANY single field must compare
 * unequal.** It is driven off `Object.keys` of a real snapshot, so a field added
 * later is covered without touching this file.
 *
 * ⚠ Stubs, not mocks: `@react-native-async-storage/async-storage` and
 * `expo-localization` are the only native imports in the graph and neither is
 * exercised here — the comparator is pure. Anything that needed real behaviour
 * from them would not belong in this harness.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'agfc-preferences-harness-'));

try {
  const tsconfig = join(out, 'tsconfig.harness.json');
  writeFileSync(
    tsconfig,
    JSON.stringify({
      compilerOptions: {
        outDir: out,
        rootDir: join(repo, 'src'),
        module: 'commonjs',
        target: 'es2022',
        moduleResolution: 'node10',
        ignoreDeprecations: '6.0',
        skipLibCheck: true,
        noImplicitAny: false,
        paths: { '@/*': [join(repo, 'src/*')] },
      },
      files: [
        join(repo, 'src/store/preferences.ts'),
        join(repo, 'src/lib/timezones.ts'),
        join(repo, 'src/lib/i18n/phrases.ts'),
        join(repo, 'src/lib/cronogol/leagues.ts'),
        join(repo, 'src/lib/cronogol/competitions.ts'),
      ],
    }),
  );
  execFileSync('npx', ['tsc', '--project', tsconfig], { cwd: repo, stdio: 'inherit' });

  // Stub the two native modules the graph imports.
  mkdirSync(join(out, 'stub'), { recursive: true });
  writeFileSync(
    join(out, 'stub/async-storage.js'),
    'module.exports = { default: { getItem: async () => null, setItem: async () => {} } };',
  );
  writeFileSync(
    join(out, 'stub/expo-localization.js'),
    'module.exports = { getLocales: () => [{ languageCode: "es" }], getCalendars: () => [{ timeZone: "Europe/Madrid" }] };',
  );

  const require = createRequire(import.meta.url);
  const Module = require('node:module');
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === '@react-native-async-storage/async-storage') {
      return join(out, 'stub/async-storage.js');
    }
    if (request === 'expo-localization') return join(out, 'stub/expo-localization.js');
    if (typeof request === 'string' && request.startsWith('@/')) {
      return resolve.call(this, join(out, request.slice(2)), ...rest);
    }
    // ⚠ The build lands in a temp dir, so a BARE import ('react', for
    // `useSyncExternalStore`) cannot see the repo's node_modules from there.
    if (typeof request === 'string' && !request.startsWith('.') && !request.startsWith('/')) {
      try {
        return require.resolve(request, { paths: [join(repo, 'node_modules')] });
      } catch {
        /* fall through to the default resolver */
      }
    }
    return resolve.call(this, request, ...rest);
  };

  const { samePreferences, SAVED_STORY_CAP } = require(join(out, 'store/preferences.js'));
  assert.equal(typeof samePreferences, 'function');
  assert.ok(SAVED_STORY_CAP > 0, 'the module loaded, not just resolved');

  /** A complete, realistic snapshot — every field populated, nothing defaulted away. */
  const base = Object.freeze({
    v: 6,
    followed: ['barcelona', 'real-madrid'],
    tz: 'Europe/Madrid',
    clock: '24',
    lang: 'es',
    onboarded: true,
    alertReminder: true,
    alertMoved: true,
    alertPostponed: true,
    alertGoals: false,
    reminderLeads: [30],
    newsSeenAt: '2026-09-13T12:00:00.000Z',
    savedStories: [{ url: 'https://example.test/a', title: 'A' }],
    leagueSlug: 'la-liga',
  });

  /* ── 1 · Identity ────────────────────────────────────────────────────────── */

  assert.equal(samePreferences(base, { ...base }), true, 'an equal payload is equal');

  /* ── 2 · THE bug: only the league moved ──────────────────────────────────── */

  assert.equal(
    samePreferences(base, { ...base, leagueSlug: 'premier-league' }),
    false,
    'a payload differing ONLY in leagueSlug must compare UNEQUAL — this is the ' +
      'assertion whose absence shipped a dead league switcher (ADR 0166)',
  );

  /* ── 3 · Every field, generically ────────────────────────────────────────── */

  /** A value guaranteed different from `base[key]`, per field shape. */
  const mutate = (key) => {
    const v = base[key];
    if (Array.isArray(v)) {
      return key === 'savedStories'
        ? [{ url: 'https://example.test/DIFFERENT', title: 'A' }]
        : key === 'reminderLeads'
          ? [15]
          : ['someone-else'];
    }
    if (typeof v === 'boolean') return !v;
    if (typeof v === 'number') return v + 1;
    return v === null ? 'not-null' : `${v}-changed`;
  };

  const keys = Object.keys(base);
  assert.ok(keys.length >= 14, `expected the full shape, got ${keys.length} keys`);

  for (const key of keys) {
    const next = { ...base, [key]: mutate(key) };
    assert.equal(
      samePreferences(base, next),
      false,
      `a payload differing only in \`${key}\` must compare UNEQUAL — otherwise ` +
        `commit() skips both the snapshot swap and the emit, and every writer of ` +
        `that field silently does nothing on screen`,
    );
  }
  console.log(`  every one of ${keys.length} fields compares unequal when it alone moves`);

  /* ── 4 · A field present on one side only ────────────────────────────────── */

  // A snapshot from before a schema bump is missing the new field entirely.
  const { leagueSlug: _dropped, ...older } = base;
  assert.equal(
    samePreferences(older, base),
    false,
    'a payload MISSING a field the other has must compare unequal — walking one ' +
      "side's keys alone would call these equal",
  );
  assert.equal(samePreferences(base, older), false, 'and in the other direction');

  /* ── 5 · The array rules still hold ──────────────────────────────────────── */

  assert.equal(
    samePreferences(base, { ...base, followed: ['real-madrid', 'barcelona'] }),
    false,
    'follow ORDER is part of the list — the store keeps it earliest-first',
  );
  assert.equal(
    samePreferences(base, {
      ...base,
      savedStories: [{ url: 'https://example.test/a', title: 'A DIFFERENT TITLE' }],
    }),
    true,
    'saved stories compare by URL alone — the writers only add or remove whole rows',
  );

  console.log('\npreferences: all assertions passed.');
} finally {
  rmSync(out, { recursive: true, force: true });
}
