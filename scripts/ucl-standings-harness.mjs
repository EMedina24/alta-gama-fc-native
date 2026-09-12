/**
 * Plain-node harness for `lib/cronogol/competitions.ts` — the pure half of the
 * Champions League tab (ADR 0150/0151).
 *
 * Run: `node scripts/ucl-standings-harness.mjs`.
 *
 * It exists because the three rules most likely to ship a lie on this screen are
 * all provable without a build, and none of them would be caught by a
 * screenshot — every one of them renders as a table that looks entirely normal:
 *
 *   1. **A band painted on an unbandable table.** The API doc says refuse below
 *      36 clubs; it does NOT say refuse an unplayed one. Between the July
 *      rollover and September the route serves 36 clubs on zero, ties fall to a
 *      club-slug sort, and banding it would put nine real clubs in "Eliminados"
 *      on alphabetical order alone. That is trap 20's second clause, and it is
 *      the one the doc omits — so the assertion below is the only place it is
 *      proven rather than merely described.
 *   2. **The caption's denominator.** The league phase is EIGHT rounds.
 *      `roundCount()` over 36 clubs is **70**, and the two are one typo apart.
 *      The harness prints both side by side.
 *   3. **A crest with no `xsmall`.** Only 23 of the 36 carry that key, so 13
 *      rows depend on `crestSrc`'s terminal `logoUrl` fallback — and the doc's
 *      own sample carries `large`, which is not in the `xsmall` ladder.
 *
 * ⚠ The fixture is a REAL production payload captured 2026-09-11 from
 * `crono-gol.com/cronogol/ucl/standings`, not a hand-written sample — trap 48: a
 * field a sample invents is a field the test cannot check. It is guarded before
 * it is asserted through, so a re-capture that changes the data fails loudly
 * rather than quietly weakening everything below it.
 *
 * ⚠ **Nothing here asserts rank ORDER, and nothing may.** `rank` is the wire's,
 * and this competition's rule has no head-to-head and stops before UEFA's last
 * two criteria — so our order can legitimately differ from uefa.com's, and a
 * client-side sort would agree with neither.
 *
 * The transpile-and-require mechanics are `team-window-harness.mjs`'s, verbatim
 * in shape; see that file's header for why CommonJS and why the alias hook.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'agfc-ucl-standings-harness-'));

const load = (name) =>
  JSON.parse(readFileSync(join(repo, 'scripts/fixtures', name), 'utf8'));

let passed = 0;
const ok = (label, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
};

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
        paths: { '@/*': [join(repo, 'src/*')] },
      },
      files: [
        join(repo, 'src/lib/cronogol/competitions.ts'),
        join(repo, 'src/lib/cronogol/derive.ts'),
        join(repo, 'src/lib/cronogol/leagues.ts'),
        join(repo, 'src/lib/cronogol/standings.ts'),
        join(repo, 'src/lib/cronogol/feed.ts'),
      ],
    }),
  );
  execFileSync('npx', ['tsc', '--project', tsconfig], { cwd: repo, stdio: 'inherit' });

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
  const {
    UCL_LEAGUE_PHASE,
    cupBandFor,
    cupBandsApply,
    cupCaption,
    uclFixtureRow,
    uclOpeningRound,
    uclRoundPlayed,
    usedCupBands,
  } = lib('competitions.js');
  const { abbreviate, crestSrc } = lib('derive.js');
  const { LEAGUES, roundCount } = lib('leagues.js');
  const { bandRangeLabel } = lib('standings.js');
  const { googleAddUrl, jornadaFeedUrl, uclJornadaFeedUrl, uclSeasonFeedUrl, webcalUrl } =
    lib('feed.js');

  const comp = UCL_LEAGUE_PHASE;
  const view = load('ucl-standings-2026.json');

  /* ── Fixture guard ──────────────────────────────────────────────────────── */
  console.log('\nfixture');
  ok('is the 2026 league phase, full field, played', () => {
    assert.equal(view.season, 2026);
    assert.equal(view.clubs, 36);
    assert.equal(view.rows.length, 36);
    assert.ok(view.lastMatchUtc !== null);
    assert.equal(view.matchday, 1);
  });
  ok('carries NO form on any row — absent, not empty', () => {
    for (const row of view.rows) {
      assert.ok(!('form' in row), `${row.team.slug} carries a form field`);
    }
  });

  /* ── Bands ──────────────────────────────────────────────────────────────── */
  console.log('\ncupBandFor — the format is 1-8 / 9-24 / 25-36');
  ok('slices on the wire rank, inclusive at both edges', () => {
    assert.equal(cupBandFor(1, comp), 'r16');
    assert.equal(cupBandFor(8, comp), 'r16');
    assert.equal(cupBandFor(9, comp), 'playoff');
    assert.equal(cupBandFor(24, comp), 'playoff');
    assert.equal(cupBandFor(25, comp), 'out');
    assert.equal(cupBandFor(36, comp), 'out');
  });
  ok('is null outside the field — never an array index', () => {
    assert.equal(cupBandFor(0, comp), null);
    assert.equal(cupBandFor(37, comp), null);
  });

  console.log('\ncupBandsApply — three clauses, one of them undocumented');
  ok('true on the real payload', () => {
    assert.equal(cupBandsApply(view, comp), true);
  });
  ok('false on a SHORT rows array under a correct `clubs` (the doc\'s own case)', () => {
    const short = { ...view, rows: view.rows.slice(0, 35) };
    assert.equal(short.clubs, 36, 'the server assertion is deliberately left intact');
    assert.equal(cupBandsApply(short, comp), false);
  });
  ok('false when the server itself reports a short roster', () => {
    assert.equal(cupBandsApply({ ...view, clubs: 35 }, comp), false);
  });
  ok('⚠ false on 36 clubs at ZERO — the clause the API doc omits', () => {
    const unplayed = {
      ...view,
      matchday: null,
      lastMatchUtc: null,
      rows: view.rows.map((row) => ({
        ...row,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      })),
    };
    assert.equal(unplayed.clubs, 36);
    assert.equal(unplayed.rows.length, 36);
    // Every number in that table is correct. Only the ORDER is meaningless —
    // it is a club-slug sort — which is why the colour would be the lie.
    assert.equal(cupBandsApply(unplayed, comp), false);
  });

  console.log('\nusedCupBands — legend order is first appearance, top-down');
  ok('names all three, in rank order', () => {
    assert.deepEqual(usedCupBands(view.rows, comp), ['r16', 'playoff', 'out']);
  });
  ok('names only what is on screen', () => {
    assert.deepEqual(usedCupBands(view.rows.slice(0, 8), comp), ['r16']);
  });

  /* ── Caption ────────────────────────────────────────────────────────────── */
  console.log('\ncupCaption — the denominator is 8, and 70 is one typo away');
  const copy = {
    afterMatchday: (n, total) => `After MD ${n} of ${total}`,
    clubCount: (n) => `${n} clubs`,
  };
  ok('prints the server matchday verbatim over the league-phase round count', () => {
    assert.equal(cupCaption(view, comp, copy), 'After MD 1 of 8 · 36 clubs');
    assert.equal(comp.matchdays, 8);
    // ⚠ THE reason a `League` cannot hold this competition: `roundCount` is
    // `2 * (clubs - 1)`, which is a double round-robin. Each club here plays
    // eight of the other thirty-five, once.
    assert.equal(roundCount({ clubCount: comp.clubs }), 70);
  });
  ok('degrades to the club count mid-round — the COMMON state, not an edge', () => {
    assert.equal(cupCaption({ ...view, matchday: null }, comp, copy), '36 clubs');
  });

  /* ── Legend ─────────────────────────────────────────────────────────────── */
  console.log('\nbandRangeLabel — the legend reads config, never the copy string');
  ok('prints the cup bands as the format states them', () => {
    assert.deepEqual(
      comp.bands.map(bandRangeLabel),
      ['1\u20138', '9\u201324', '25\u201336'],
    );
  });
  ok('⚠ a SINGLE-position band is one number, not `6\u20136`', () => {
    const serieA = LEAGUES.find((l) => l.slug === 'serie-a');
    // Serie A's Conference place is 7 alone; its Europa places run 5\u20136.
    assert.equal(bandRangeLabel({ from: 7, to: 7 }), '7');
    assert.deepEqual(serieA.zones.map(bandRangeLabel), ['1\u20134', '5\u20136', '7', '18\u201320']);
  });
  ok('uses an EN DASH, not a hyphen, beside tabular figures', () => {
    assert.ok(bandRangeLabel({ from: 1, to: 8 }).includes('\u2013'));
    assert.ok(!bandRangeLabel({ from: 1, to: 8 }).includes('-'));
  });

  /* ── Row identity ───────────────────────────────────────────────────────── */
  console.log('\nrow identity — every club draws something');
  ok('crestSrc resolves for all 36, though only some carry an `xsmall`', () => {
    const withXsmall = view.rows.filter((r) => r.team.logoUrls?.xsmall).length;
    assert.ok(withXsmall < 36, 'fixture no longer exercises the fallback');
    for (const row of view.rows) {
      assert.ok(
        crestSrc(row.team.logoUrls, row.team.logoUrl, 'xsmall') !== null,
        `${row.team.slug} resolves no crest`,
      );
    }
    console.log(`    (${withXsmall}/36 carry xsmall; the rest fall through to logoUrl)`);
  });
  ok('abbreviate yields a monogram for all 36', () => {
    for (const row of view.rows) {
      const code = abbreviate(row.team.name, row.team.slug, row.team.shortName);
      assert.ok(code && code.length > 0, `${row.team.slug} has no monogram`);
    }
  });

  /* ── The league phase as a MATCHDAY (§124) ──────────────────────────────── */
  console.log('\nthe round list — a second data path through the same rows');
  const index = load('ucl-season-rounds-2026.json');
  const md1 = load('ucl-jornada-2026-md1.json');

  ok('fixture guard: 8 rounds of 18, round 1 played out', () => {
    assert.equal(index.matchdays.length, 8);
    assert.equal(md1.count, 18);
    assert.equal(md1.fixtures.length, 18);
    const r1 = index.matchdays.find((r) => r.matchday === 1);
    assert.equal(r1.fixtures, 18);
    assert.equal(r1.finished, 18);
  });

  ok('⚠ the round count is the INDEX LENGTH — roundCount() would say 70', () => {
    assert.equal(index.matchdays.length, comp.matchdays);
    assert.equal(roundCount({ clubCount: comp.clubs }), 70);
  });

  ok('⚠ `stages` is [] before the February draw — the normal state, not a gap', () => {
    assert.deepEqual(index.stages, []);
  });

  ok('uclRoundPlayed reads finished === fixtures, never a clock', () => {
    assert.equal(uclRoundPlayed(index.matchdays.find((r) => r.matchday === 1)), true);
    assert.equal(uclRoundPlayed(index.matchdays.find((r) => r.matchday === 2)), false);
    // ⚠ A round nobody has played is NOT "played out", even at zero of zero.
    assert.equal(uclRoundPlayed({ matchday: 9, fixtures: 0, finished: 0 }), false);
  });

  ok('uclOpeningRound stops at the first round not played out', () => {
    assert.equal(uclOpeningRound(index.matchdays), 2);
    assert.equal(uclOpeningRound([]), null);
    // Season over: hold on the last round rather than falling off the end.
    assert.equal(
      uclOpeningRound(index.matchdays.map((r) => ({ ...r, finished: r.fixtures }))),
      8,
    );
  });

  console.log('\nuclFixtureRow — the neutral row every organism already draws');
  ok('carries the COMPETITION id, never the club-centric twin', () => {
    const withTwin = md1.fixtures.find((i) => i.fixture.fixtureId);
    assert.ok(withTwin, 'fixture no longer exercises the twin');
    const row = uclFixtureRow(withTwin);
    assert.equal(row.id, withTwin.fixture.id);
    assert.notEqual(row.id, withTwin.fixture.fixtureId);
  });
  ok('⚠ only a MINORITY carry that twin — routing through it loses the rest', () => {
    const twins = md1.fixtures.filter((i) => i.fixture.fixtureId).length;
    assert.ok(twins < md1.fixtures.length / 2, `${twins}/18 carry a twin`);
    console.log(`    (${twins}/18 carry fixtureId — the other ${18 - twins} have no club-side id at all)`);
  });
  ok('maps every row, home-away and never for-against', () => {
    for (const item of md1.fixtures) {
      const row = uclFixtureRow(item);
      assert.equal(row.competition, 'cup');
      assert.equal(row.competitionName, 'UEFA Champions League');
      assert.equal(row.goalsHome, item.fixture.goalsHome);
      assert.equal(row.goalsAway, item.fixture.goalsAway);
      assert.equal(row.homeTeam, item.home);
      assert.equal(row.awayTeam, item.away);
      assert.ok(!('form' in row));
    }
  });
  ok('passes a null side THROUGH — a pre-draw placeholder is not a missing club', () => {
    const predraw = { fixture: { ...md1.fixtures[0].fixture }, home: null, away: null };
    const row = uclFixtureRow(predraw);
    assert.equal(row.homeTeam, null);
    assert.equal(row.awayTeam, null);
  });

  /* ── Calendar feeds (§125) ──────────────────────────────────────────────── */
  console.log('\ncalendar feeds — a URL that reaches a device cannot be recalled');
  ok('the two cup feeds are the documented paths, verbatim', () => {
    assert.equal(
      uclSeasonFeedUrl(2026),
      'https://crono-gol.com/cronogol/feed/ucl/2026.ics',
    );
    assert.equal(
      uclJornadaFeedUrl(2026, 2),
      'https://crono-gol.com/cronogol/feed/ucl/jornada/2026/2.ics',
    );
  });
  ok('⚠ the ORIGIN is pinned, never an env-driven API base', () => {
    for (const url of [uclSeasonFeedUrl(2026), uclJornadaFeedUrl(2026, 1), jornadaFeedUrl('laliga', 2026, 1)]) {
      assert.ok(url.startsWith('https://crono-gol.com/'), url);
    }
  });
  ok('webcalUrl swaps the SCHEME and nothing else', () => {
    const https = uclSeasonFeedUrl(2026);
    assert.equal(webcalUrl(https), 'webcal://crono-gol.com/cronogol/feed/ucl/2026.ics');
    assert.equal(webcalUrl(https).slice(9), https.slice(8));
  });
  ok('⚠⚠ googleAddUrl carries the WEBCAL form — an https cid silently adds nothing', () => {
    const cid = googleAddUrl(webcalUrl(uclSeasonFeedUrl(2026)));
    assert.ok(cid.includes(encodeURIComponent('webcal://')));
    assert.ok(!cid.includes(encodeURIComponent('https://crono-gol.com')));
    // ⚠ This function does NOT convert. The web app's same-named one does, and
    // copy-pasting it here would double-convert and reinstate the shipped bug.
    assert.ok(googleAddUrl(uclSeasonFeedUrl(2026)).includes(encodeURIComponent('https://')));
  });

  console.log(`\n${passed} assertions passed.\n`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
