/**
 * Plain-node harness for the pure board modules — `matchEventsCapable`'s
 * competition gate (ADR 0132 §10, opened for the UCL by ADR 0137) and
 * `eventSide`'s slug-less-opponent elimination rule (ADR 0137).
 *
 * ADR 0132's original 14-assertion harness was scratch and thrown away; this
 * one is checked in. Run: `node scripts/team-window-harness.mjs`.
 *
 * How it runs repo TypeScript in plain node: the pure modules (`leagues`,
 * `team-window`, `events` — no native imports, by that layer's own rule) are
 * transpiled to CommonJS in a scratch dir with `npx tsc`, then `require`d.
 * CJS is deliberate: the sources use extensionless relative imports, which
 * node's ESM loader rejects and `require` resolves.
 *
 * ⚠ `fixtures/ucl-rm-inter-events.json` is the REAL production payload for
 * Real Madrid 2–1 Inter (UCL jornada 1, 2026-09-08), captured 2026-09-09 from
 * `GET /cronogol/fixtures/0d457708-8ed5-406a-8d3f-c5686cfb887d/events` —
 * trap 48: a field a sample invents is a field the test cannot check. The
 * gallery's `?only=last` UCL case renders a subset of the same payload.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'agfc-team-window-harness-'));

try {
  execFileSync(
    'npx',
    [
      'tsc',
      // The repo tsconfig targets the app bundle; this emit is scratch-only.
      '--ignoreConfig',
      join(repo, 'src/lib/cronogol/leagues.ts'),
      join(repo, 'src/lib/cronogol/team-window.ts'),
      join(repo, 'src/lib/cronogol/events.ts'),
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
    ],
    { cwd: repo, stdio: 'inherit' },
  );

  const require = createRequire(import.meta.url);
  const { matchEventsCapable } = require(join(out, 'team-window.js'));
  const { eventSide } = require(join(out, 'events.js'));

  // ── matchEventsCapable ────────────────────────────────────────────────────
  // League branch: byte-for-byte the pre-0137 semantics (ADR 0132 §10).
  assert.equal(
    matchEventsCapable({ competition: 'league', leagueSlug: 'laliga', competitionName: 'LaLiga' }),
    true, 'league + known league is enabled');
  assert.equal(
    matchEventsCapable({ competition: 'league', leagueSlug: '', competitionName: null }),
    true, "league + the '' sentinel (segunda) stays enabled — unknown league is not a denial");
  assert.equal(
    matchEventsCapable({ competition: 'league', leagueSlug: 'lpr-pro-clausura', competitionName: null }),
    false, 'league + LPR (matchEvents: false, ADR 0105) stays disabled');

  // Non-league branch: the dated allowlist on the EXACT wire name (ADR 0137).
  assert.equal(
    matchEventsCapable({ competition: 'cup', leagueSlug: '', competitionName: 'UEFA Champions League' }),
    true, 'cup + UEFA Champions League OPENS — verified 2026-09-09 (handoff_ucl-events/EVIDENCE.md)');
  assert.equal(
    matchEventsCapable({ competition: 'cup', leagueSlug: '', competitionName: 'Copa del Rey' }),
    false, 'cup + Copa del Rey stays closed — unobserved (ADR 0105)');
  assert.equal(
    matchEventsCapable({ competition: 'friendly', leagueSlug: '', competitionName: 'Club Friendly' }),
    false, 'friendly stays closed');
  assert.equal(
    matchEventsCapable({ competition: 'cup', leagueSlug: '', competitionName: null }),
    false, 'cup with no competitionName stays closed — a null name matches no allowlist entry');
  console.log('matchEventsCapable: 7 assertions pass');

  // ── eventSide ─────────────────────────────────────────────────────────────
  const payload = JSON.parse(
    readFileSync(new URL('./fixtures/ucl-rm-inter-events.json', import.meta.url), 'utf8'),
  );
  // Guard the fixture file itself before asserting through it.
  assert.equal(payload.count, 16, 'captured payload holds 16 events');
  assert.deepEqual(
    payload.events.reduce((acc, e) => ((acc[e.teamSlug] = (acc[e.teamSlug] ?? 0) + 1), acc), {}),
    { 'real-madrid': 7, 'inter-inter': 9 },
    'captured payload attribution matches EVIDENCE.md (7 · 9 · no nulls)');

  const ref = (slug, name) => ({ slug, name, shortName: null, logoUrl: null, logoUrls: null });
  const HOME = ref('real-madrid', 'Real Madrid');
  const AWAY_SENTINEL = ref('', 'Inter'); // opponentRef()'s exact shape
  const AWAY_REAL = ref('inter-inter', 'Inter');
  const tally = (home, away) =>
    payload.events.reduce(
      (acc, e) => ((acc[eventSide(e, home, away) ?? 'none'] += 1), acc),
      { home: 0, away: 0, none: 0 },
    );

  // The team-window shape: the opponent is slug-less, so Inter's nine events
  // can only land by elimination. Zero "neither side" rows.
  assert.deepEqual(tally(HOME, AWAY_SENTINEL), { home: 7, away: 9, none: 0 },
    'slug-less opponent: 7 home, 9 away by elimination, none dropped');
  // The mirror: the followed club away, the slug-less side at home.
  assert.deepEqual(tally(ref('', 'Real Madrid'), AWAY_REAL), { home: 7, away: 9, none: 0 },
    'slug-less HOME side: the mirror elimination');
  // Two real slugs (a jornada/window row): today's behavior, untouched.
  assert.deepEqual(tally(HOME, AWAY_REAL), { home: 7, away: 9, none: 0 },
    'two real slugs: unchanged direct matching');
  // A VAR decision belonging to neither side still renders crest-less.
  assert.equal(eventSide({ ...payload.events[0], teamSlug: null }, HOME, AWAY_SENTINEL), null,
    'teamSlug null stays null — elimination never reaches it');
  // Two real slugs, neither matching: the no-crosswalk case stays null.
  assert.equal(eventSide(payload.events[2], HOME, ref('someone-else', 'X')), null,
    'two real slugs with no match stay null — elimination needs a slug-less side');
  // Two slug-less sides: never guess between two unknowns.
  assert.equal(eventSide(payload.events[2], ref('', 'A'), ref('', 'B')), null,
    'two slug-less sides stay null');
  // A side missing entirely never wins by elimination.
  assert.equal(eventSide(payload.events[2], HOME, null), null,
    'a null side never wins by elimination');
  console.log('eventSide: 9 assertions pass');

  console.log('team-window harness: ALL PASS');
} finally {
  rmSync(out, { recursive: true, force: true });
}
