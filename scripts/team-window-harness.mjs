/**
 * Plain-node harness for the pure board modules — `matchEventsCapable`'s
 * competition gate (ADR 0132 §10, opened for the UCL by ADR 0137),
 * `eventSide`'s slug-less-opponent elimination rule (ADR 0137),
 * `crestSrc`'s fall-through to the mirrored `logoUrl` (ADR 0159), and
 * `playerFamilyName`'s shirt-name rule (ADR 0161).
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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'agfc-team-window-harness-'));

try {
  // ⚠ A scratch tsconfig rather than files-on-the-command-line: `live.ts`
  // reaches `board.ts` → `jornada.ts`, which imports `@/lib/format`, and the
  // `paths` alias cannot be passed as a CLI flag. `rootDir` is `src/` so the
  // emitted tree mirrors the repo's and the alias hook below can be one rule.
  // ⚠ tsc follows the imports itself — listing the four entry points emits
  // every module they reach.
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
        // node10 + `paths` is what mirrors Metro's own resolution; both are
        // deprecation-warned in TS 6 and neither has a replacement that keeps
        // a CommonJS emit, which `require` below needs.
        ignoreDeprecations: '6.0',
        skipLibCheck: true,
        paths: { '@/*': [join(repo, 'src/*')] },
      },
      files: [
        join(repo, 'src/lib/cronogol/leagues.ts'),
        join(repo, 'src/lib/cronogol/team-window.ts'),
        join(repo, 'src/lib/cronogol/events.ts'),
        join(repo, 'src/lib/cronogol/live.ts'),
        join(repo, 'src/lib/cronogol/derive.ts'),
      ],
    }),
  );
  execFileSync('npx', ['tsc', '--project', tsconfig], { cwd: repo, stdio: 'inherit' });

  // ⚠⚠ **tsc does not rewrite `@/…` in its OUTPUT** — the emitted `require`
  // keeps the literal specifier, so without this hook `live.js` dies on
  // `board` → `jornada` → `@/lib/format` at load time. One rule, `@/x` → the
  // emitted `x`, which is exactly what `rootDir: src` bought.
  const require = createRequire(import.meta.url);
  const Module = require('node:module');
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (typeof request === 'string' && request.startsWith('@/')) {
      return resolve.call(this, join(out, request.slice(2)), ...rest);
    }
    return resolve.call(this, request, ...rest);
  };

  const lib = (name) => require(join(out, 'lib/cronogol', name));
  const { matchEventsCapable } = lib('team-window.js');
  const { eventSide } = lib('events.js');
  const { teamRefFromLive, boardFromRoute } = lib('live.js');
  const { crestSrc, playerFamilyName, playerDisplayName } = lib('derive.js');

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
  assert.equal(
    matchEventsCapable({
      competition: 'league',
      leagueSlug: 'liga-nacional-apertura',
      competitionName: null,
    }),
    false, 'league + Liga Hondubet (matchEvents: false, ADR 0159) stays disabled');

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

  // ── teamRefFromLive / boardFromRoute — the cross-provider crest fallback ───
  // The REAL production shape, 2026-09-09 20:45Z: the live route named this tie
  // `napoli-459` v `arsenal` (the premier-league sync's own team rows), while
  // `GET /cronogol/teams` serves only the tracked `napoli` and `arsenal`.
  const CATALOGUE = [
    { slug: 'arsenal', logoUrl: 'arsenal.png', logoUrls: { xsmall: 'arsenal-xs.png' } },
    { slug: 'napoli', logoUrl: 'napoli-tracked.png', logoUrls: { xsmall: 'napoli-tracked-xs.png' } },
  ];
  const liveRef = (slug, name) => ({ slug, name, shortName: null });
  const NAPOLI_FIXTURE_REF = {
    slug: '', name: 'Napoli', shortName: null,
    logoUrl: 'napoli-459.png', logoUrls: { xsmall: 'napoli-459-xs.png' },
  };

  // Catalogue MISS + the fixture row has artwork → the fixture's crest is used.
  const eliminated = teamRefFromLive(liveRef('napoli-459', 'Napoli'), CATALOGUE, NAPOLI_FIXTURE_REF);
  assert.equal(eliminated.logoUrl, 'napoli-459.png',
    'untracked provider slug falls back to the fixture row crest');
  assert.deepEqual(eliminated.logoUrls, { xsmall: 'napoli-459-xs.png' },
    'the whole variant set travels, not just the single url');
  assert.equal(eliminated.slug, 'napoli-459',
    'the LIVE slug is kept — the fallback lends artwork, never identity');

  // Catalogue HIT → unchanged, and the catalogue outranks the fixture row.
  assert.equal(
    teamRefFromLive(liveRef('arsenal', 'Arsenal'), CATALOGUE, NAPOLI_FIXTURE_REF).logoUrl,
    'arsenal.png', 'a tracked slug still wins from the catalogue');

  // Neither → null, the monogram path, exactly as before.
  assert.equal(teamRefFromLive(liveRef('nobody-123', 'Nobody'), CATALOGUE, null).logoUrl, null,
    'no catalogue and no fixture row stays null (the monogram)');
  assert.equal(teamRefFromLive(liveRef('nobody-123', 'Nobody'), CATALOGUE).logoUrl, null,
    'the fallback argument is optional — pre-0138 call shape unchanged');

  // Side alignment is by POSITION on one fixture id, never by slug.
  const board = boardFromRoute(
    {
      fixtureId: '67cc1959', kickoffUtc: '2026-09-09T19:00:00+00:00', status: 'live',
      home: liveRef('napoli-459', 'Napoli'), away: liveRef('arsenal', 'Arsenal'),
      score: { home: 0, away: 1 },
    },
    CATALOGUE,
    { id: '67cc1959', homeTeam: NAPOLI_FIXTURE_REF, awayTeam: null },
  );
  assert.equal(board.fixture.homeTeam.logoUrl, 'napoli-459.png',
    'the fixture row home side lends to the live home side');
  assert.equal(board.fixture.awayTeam.logoUrl, 'arsenal.png',
    'a null side on the fixture row costs nothing — the catalogue still answers');
  assert.equal(board.source, 'route', 'still a tier-0 board');
  console.log('teamRefFromLive/boardFromRoute: 9 assertions pass');

  // ── crestSrc: the S1 fall-through ─────────────────────────────────────────
  // ⚠⚠ Liga Hondubet's clubs carry `logoUrls: { S1 }` and NOTHING else, and
  // that S1 URL points at the Genius Sports image CDN — which 403s on a burst,
  // and a 403 writes a PERMANENT `asset_mirrors.rejected_at` on the backend
  // that no later sweep retries. A twelve-crest grid is exactly that burst.
  //
  // `logoUrl` is our own mirrored copy. This app already renders it, because
  // `S1` appears in none of the four per-league key vocabularies in
  // `CREST_KEYS`, so every size walks its list, matches nothing and falls
  // through. ⚠ That safety is INCIDENTAL rather than designed — nobody added
  // S1 to a deny-list — so it is pinned here: a well-meaning "add the sizes the
  // scraped leagues serve" would silently start hot-linking a CDN we can be
  // locked out of for good. ADR 0159.
  const HN_URLS = { S1: 'https://images.statsengine.playbyplay.api.geniussports.com/abc123S1.png' };
  const HN_MIRROR = 'https://altagamafc.crono-gol.com/storage/v1/object/public/team-assets/crests/def456.png';
  for (const want of ['xsmall', 'small', 'medium', 'card']) {
    assert.equal(crestSrc(HN_URLS, HN_MIRROR, want), HN_MIRROR,
      `crestSrc(${want}) falls past the S1-only map to the mirrored logoUrl`);
  }
  // The neighbouring behaviours this must not have broken.
  assert.equal(crestSrc({ svg: 's.svg', small: 's.png' }, 'fallback.png', 'small'), 's.png',
    'a matching size key still outranks logoUrl');
  assert.equal(crestSrc(null, HN_MIRROR, 'small'), HN_MIRROR,
    'a null map is the logoUrl, as for an opponent-only club');
  assert.equal(crestSrc({ S1: 'genius.png' }, null, 'small'), null,
    'S1 alone with no mirror is NULL — the monogram, never the third-party CDN');
  console.log('crestSrc: 7 assertions pass');

  // ── playerFamilyName: the shirt name (ADR 0161) ───────────────────────────
  // Shape 1 — the comma form. Unchanged from before 0161; Puerto Rico's.
  assert.equal(playerFamilyName('COTTO MARTINEZ, LUIS ALEJANDRO'), 'COTTO MARTINEZ',
    'the comma form still yields the whole surname half, both surnames');
  assert.equal(playerFamilyName('MALFORMED,'), 'MALFORMED',
    'a trailing comma keeps the half that is real — and note this DIFFERS from '
    + 'playerDisplayName, which returns the name whole for the same input');

  // Shape 2 — under four tokens, the last word.
  assert.equal(playerFamilyName('David Raya'), 'Raya',
    'two tokens take the last — 43 of Arsenal\'s 49 have no shortName and hit this');
  assert.equal(playerFamilyName('Raul Alejandro Benitez'), 'Benitez', 'three tokens take the last');
  assert.equal(playerFamilyName('Rodrygo'), 'Rodrygo', 'one token is itself');

  // Shape 3 — four or more, the SPANISH paternal surname.
  assert.equal(playerFamilyName('Edrick Eduardo Menjivar Johnson'), 'Menjivar',
    'four tokens take the second-to-last, not the maternal surname');
  assert.equal(playerFamilyName('Edwin Alexander Rodriguez Castillo'), 'Rodriguez',
    'the longest Honduran name resolves to a shirt-sized word');

  // ⚠⚠ The guard. Every one of these printed `de` or `e` on a shirt without it.
  assert.equal(playerFamilyName('Gabriel Fernando de Jesus'), 'Jesus',
    "a particle at [-2] steps to the last word — NEVER 'de'");
  assert.equal(playerFamilyName('Rodrygo Silva de Goes'), 'Goes', "never 'de'");
  assert.equal(playerFamilyName('Bernardo Mota Veiga de Carvalho e Silva'), 'Silva',
    "never 'e' — and this one is right by accident and correct anyway");
  assert.equal(playerFamilyName('Endrick Felipe Moreira de Sousa'), 'Sousa', "never 'de'");

  // ⚠ The documented Portuguese miss, pinned so it is a KNOWN answer rather
  // than a surprise: the convention is the reverse and no name says which it
  // follows. Reached only if such a league ever serves a null shortName.
  assert.equal(playerFamilyName('Gabriel dos Santos Magalhães'), 'Santos',
    'Portuguese order answers the MATERNAL surname — documented, not fixed here');

  // playerFamilyName must not have disturbed its sibling.
  assert.equal(playerDisplayName('COTTO MARTINEZ, LUIS ALEJANDRO'), 'LUIS ALEJANDRO COTTO MARTINEZ',
    'playerDisplayName still flips on the first comma only');
  assert.equal(playerDisplayName('Edrick Eduardo Menjivar Johnson'), 'Edrick Eduardo Menjivar Johnson',
    'a comma-less name is returned untouched — lists and headers keep the full name');
  console.log('playerFamilyName: 14 assertions pass');

  console.log('team-window harness: ALL PASS');
} finally {
  rmSync(out, { recursive: true, force: true });
}
