/**
 * Plain-node harness for `lib/cronogol/stats.ts` — the pure half of the Season
 * stats screen (ADR 0141/0143/0144).
 *
 * Run: `node scripts/season-stats-harness.mjs`.
 *
 * It exists because the two rules most likely to ship a lie on this screen are
 * both provable without a build, and both are counter-intuitive enough that a
 * screenshot would not catch them:
 *
 *   1. **The axis is kickoff order, not matchweek.** Barcelona's live 2026
 *      LaLiga timeline reads `mw 2, 1, 3, 4` — a postponement, exactly the case
 *      `CRONOGOL-API.md` §3 warns about — so a cumulative line drawn on `mw`
 *      would disagree with the `scoringRun` on the same card.
 *   2. **A null is never a zero.** The Bundesliga fixture below has every
 *      event-derived field null while its scoreline block is complete, so a
 *      client that treats `timeline` as nullable renders a blank card where the
 *      only working chart is.
 *   3. **A MERGED timeline may not be grouped by matchweek** (ADR 0149).
 *      Matchweek numbers are per-competition namespaces, and TypeScript cannot
 *      catch the mistake — `StatsMergedTimelineEntryView` extends the
 *      per-competition entry, so a merged array is structurally assignable to
 *      every helper here. The assertion below therefore proves the WRONG answer
 *      `goalsByMatchweek` gives for Barcelona's real merged array, so the trap
 *      stays demonstrated rather than merely described in a comment.
 *
 * ⚠ The four fixtures are REAL production payloads re-captured 2026-09-10 from
 * `crono-gol.com` (after §120.15 shipped `seasonTotals`), not hand-written samples — trap 48: a field a sample invents
 * is a field the test cannot check. Each is guarded before it is asserted
 * through, so a re-capture that changes the data fails loudly rather than
 * quietly weakening every assertion below it.
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
const out = mkdtempSync(join(tmpdir(), 'agfc-season-stats-harness-'));

const near = (a, b, label) =>
  assert.ok(Math.abs(a - b) < 1e-9, `${label} (${a} vs ${b})`);

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
        join(repo, 'src/lib/cronogol/leagues.ts'),
        join(repo, 'src/lib/cronogol/stats.ts'),
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
  const { findLeague, roundCount, SEASON } = lib('leagues.js');
  const {
    bandSeries,
    bandTotal,
    cumulativeGoals,
    goalsByMatchweek,
    halfSplit,
    hasEvents,
    lateShare,
    openPlayGoals,
    chartsExclude,
    perMatch,
    pickPlayerSeason,
    pickPlayerTotals,
    pickTeamSeason,
    pickTeamTotals,
    runLabel,
    scoredStrip,
    statsSlug,
  } = lib('stats.js');

  const fixture = (name) =>
    JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

  const barca = fixture('stats-team-barcelona.json');
  const bayern = fixture('stats-team-bayern.json');
  const raphinha = fixture('stats-player-raphinha.json');
  const valverde = fixture('stats-player-valverde.json');

  const LA_LIGA = findLeague('la-liga');
  const BUNDESLIGA = findLeague('bundesliga');
  const PREMIER = findLeague('premier-league');

  // ── The fixtures themselves ───────────────────────────────────────────────
  assert.equal(SEASON, 2026, 'the harness asserts against the season the app renders');
  assert.equal(barca.seasons.length, 3,
    'captured Barcelona payload holds THREE competition-season blocks');
  assert.deepEqual(
    barca.seasons.map((s) => `${s.season}:${s.competition}`),
    ['2026:champions-league', '2026:laliga', '2025:champions-league'],
    'and `seasons[0]` is a CUP block — the reason pickTeamSeason exists');
  /**
   * ⚠ Bayern gained a 2025 champions-league block between the 2026-09-10 capture
   * and the re-capture for ADR 0149, so the guard asserts what actually matters
   * rather than a payload length: exactly ONE block for the season the app
   * renders, and that block is the Bundesliga one. Its merged 2026 block is
   * therefore its league block, which is the single-competition case the scope
   * lines must stay silent for.
   */
  assert.deepEqual(
    bayern.seasons.filter((s) => s.season === SEASON).map((s) => s.competition),
    ['bundesliga'],
    'captured Bayern payload holds ONE 2026 block, and it is the Bundesliga');

  // ── pickTeamSeason / pickPlayerSeason ─────────────────────────────────────
  const lal = pickTeamSeason(barca, LA_LIGA, SEASON);
  assert.equal(lal.competition, 'laliga', 'picks the league block, not seasons[0]');
  assert.equal(lal.goalsFor, 17);
  const bun = pickTeamSeason(bayern, BUNDESLIGA, SEASON);
  assert.equal(bun.competition, 'bundesliga');
  assert.equal(pickTeamSeason(barca, PREMIER, SEASON), null,
    'a league the club does not play in is null, not a fallback block');
  assert.equal(pickTeamSeason(barca, LA_LIGA, 2019), null, 'an unswept season is null');
  assert.equal(pickTeamSeason(null, LA_LIGA, SEASON), null, 'no payload is null');
  assert.equal(pickTeamSeason(barca, undefined, SEASON), null,
    'an unresolved league is null — never a guess at the first block');

  const rapLal = pickPlayerSeason(raphinha, LA_LIGA, SEASON);
  assert.equal(rapLal.goals, 6);
  const rapUcl = raphinha.seasons.find(
    (s) => s.competition === 'champions-league' && s.season === SEASON);

  // ── cumulativeGoals — the kickoff-order rule ──────────────────────────────
  assert.deepEqual(lal.timeline.map((e) => e.mw), [2, 1, 3, 4],
    'the captured timeline really is OUT of matchweek order (postponement)');
  assert.deepEqual(cumulativeGoals(lal.timeline), [5, 7, 12, 17],
    'cumulative runs on the array index, in kickoff order');
  assert.equal(
    cumulativeGoals(lal.timeline).at(-1), lal.goalsFor,
    'the line ends exactly on goalsFor — timeline covers every finished fixture');
  assert.equal(cumulativeGoals(bun.timeline).at(-1), bun.goalsFor,
    'and on the Bundesliga too, where it is the only chart that works');
  assert.deepEqual(cumulativeGoals([]), [], 'an empty timeline is an empty line, not a crash');

  // Sorting by `mw` first would produce a DIFFERENT line — that is the bug.
  const byMwOrder = [...lal.timeline].sort((a, b) => a.mw - b.mw);
  assert.notDeepEqual(cumulativeGoals(byMwOrder), cumulativeGoals(lal.timeline),
    'plotting on mw genuinely disagrees with kickoff order on this payload');

  // ── goalsByMatchweek ──────────────────────────────────────────────────────
  assert.deepEqual(goalsByMatchweek(lal.timeline), [
    { mw: 1, home: 2, away: 0 },
    { mw: 2, home: 0, away: 5 },
    { mw: 3, home: 5, away: 0 },
    { mw: 4, home: 0, away: 5 },
  ], 'grouped by mw, split on venue, ordered by matchweek number');
  assert.equal(
    goalsByMatchweek(lal.timeline).reduce((a, r) => a + r.home + r.away, 0),
    lal.goalsFor, 'no goal is lost when every fixture carries a matchweek');
  assert.deepEqual(
    goalsByMatchweek([{ id: 'k', mw: null, ko: '2026-01-01T00:00:00Z', home: true, gf: 3, ga: 0 }]),
    [], 'a knockout round (mw null) is DROPPED — a matchweek chart is a league-phase chart');

  // ── scoredStrip ───────────────────────────────────────────────────────────
  assert.deepEqual(scoredStrip(lal.timeline, lal.scoringRun), [
    { scored: true, inRun: true }, { scored: true, inRun: true },
    { scored: true, inRun: true }, { scored: true, inRun: true },
  ], 'the run is a SLICE on startIndex/endIndex, never re-derived');
  assert.equal(
    scoredStrip(lal.timeline, lal.scoringRun).filter((c) => c.inRun).length,
    lal.scoringRun.length, 'the highlighted cell count equals scoringRun.length');
  const bunStrip = scoredStrip(bun.timeline, bun.scoringRun);
  assert.deepEqual(bunStrip, [
    { scored: true, inRun: true }, { scored: false, inRun: false },
  ], 'Bayern scored in one of two — a goalless match is a real dark cell');
  assert.deepEqual(
    scoredStrip(lal.timeline, null).map((c) => c.inRun), [false, false, false, false],
    'a club that never scored has no run and no highlight');

  // ── The band denominator ──────────────────────────────────────────────────
  assert.equal(bandTotal(lal.goalsForByBand), 17, 'bands sum over the wire keys');
  near(lateShare(lal.goalsForByBand), 5 / 17, 'late share is banded-late / banded-TOTAL');
  assert.deepEqual(halfSplit(lal.goalsForByBand), { first: 7, second: 10 });
  assert.equal(halfSplit(lal.goalsForByBand).first + halfSplit(lal.goalsForByBand).second,
    bandTotal(lal.goalsForByBand), 'the two halves sum to the BANDED total, not to goalsFor');

  // A goal with no minute is dropped from the bands: the denominators diverge,
  // and the banded one is the honest one.
  // (On this payload the two denominators happen to agree — bandTotal 17 ===
  //  goalsFor 17 — which is exactly why the rule needs a case that separates
  //  them rather than a screenshot of Barcelona.)
  const thin = { '1-15': 1, '76-90': 1 };   // 2 banded goals out of a season's 3
  const SEASON_GOALS_WITH_A_MINUTELESS_GOAL = 3;
  assert.equal(bandTotal(thin), 2, 'one goal carried no minute, so the bands hold 2');
  near(lateShare(thin), 1 / 2, 'the share is late / BANDED — 50%');
  assert.notEqual(1 / SEASON_GOALS_WITH_A_MINUTELESS_GOAL, lateShare(thin),
    'the naive late / season-goals denominator would have said 33% — the understatement');

  // A real zero and an unknown are different answers.
  assert.equal(lateShare(rapLal.goalsByBand), 0,
    'Raphinha scored none after 75′ — a genuine 0, from present bands');
  assert.equal(rapUcl.goalsByBand, null, 'his UCL bands are null (below the floor)');
  assert.equal(lateShare(rapUcl.goalsByBand), null, '…and a null share, NEVER 0');
  assert.equal(bandTotal(null), null);
  assert.equal(halfSplit(null), null);
  assert.equal(bandSeries(null), null);
  assert.equal(lateShare({}), null, 'a share of nothing is unanswerable, not 0%');

  assert.deepEqual(bandSeries(lal.goalsForByBand).map((b) => b.goals), [2, 3, 2, 2, 3, 5, 0],
    'bands come back in wire order, absent keys as 0');
  assert.equal(bandSeries({ '1-15': 4 }).length, 7,
    'a sparse record still yields all seven bands');

  // ── The Bundesliga: scorelines complete, every event field null ──────────
  assert.equal(bun.goalsFor, 5, 'scoreline block is real');
  assert.equal(bun.timeline.length, 2, 'timeline is real');
  assert.ok(bun.scoringRun !== null, 'scoringRun is real');
  for (const field of ['yellows', 'reds', 'comebackWins', 'comebackPoints',
                       'goalsForByBand', 'goalsAgainstByBand']) {
    assert.equal(bun[field], null, `Bundesliga ${field} is null on the wire`);
  }
  assert.equal(hasEvents(bun.coverage), false, 'so the event half is gated off as a group');
  assert.equal(hasEvents(lal.coverage), true);
  assert.equal(hasEvents(rapUcl.coverage), false,
    'coverage.sufficient can be false at ratio 1 — there is a minimum-fixtures floor');
  assert.equal(rapUcl.coverage.ratio, 1, 'and the captured payload proves it');

  // ── perMatch / openPlayGoals ──────────────────────────────────────────────
  near(perMatch(lal.goalsFor, lal.coverage), 17 / 4, 'per match divides by CLUB FIXTURES played');
  near(perMatch(bun.goalsFor, bun.coverage), 5 / 2,
    'and by fixturesTotal, not fixturesCounted — Bayern counted 0 of 2');
  assert.equal(perMatch(0, { fixturesCounted: 0, fixturesTotal: 0, ratio: 0, sufficient: false }),
    null, 'no fixtures played is null, never a divide by zero');
  assert.equal(openPlayGoals(rapLal), 5, 'open play is goals minus penalties (6 − 1)');

  // ── runLabel ──────────────────────────────────────────────────────────────
  assert.deepEqual(runLabel(lal.scoringRun), { kind: 'matchweeks', from: 2, to: 4 });
  assert.deepEqual(
    runLabel({ ...lal.scoringRun, fromMatchweek: null, toMatchweek: null }),
    { kind: 'dates',
      fromKickoffUtc: lal.scoringRun.fromKickoffUtc,
      toKickoffUtc: lal.scoringRun.toKickoffUtc },
    'a cup run captions with kickoffs — never "MD null → MD null"');
  assert.equal(runLabel(null), null);

  // ── statsSlug — the two independent gates ────────────────────────────────
  assert.equal(statsSlug({ slug: 'raphinha' }, LA_LIGA), 'raphinha');
  assert.equal(statsSlug({ slug: 'raphinha' }, BUNDESLIGA), null,
    'a league without player stats yields no URL even when a slug is present');
  assert.equal(statsSlug({ slug: null }, LA_LIGA), null,
    'and a null slug yields none even in a league that has them');
  assert.equal(statsSlug({ slug: 'anything' }, PREMIER), null,
    'the Premier League is false: every PL slug is null on the wire (2026-09-10)');
  assert.equal(statsSlug({ slug: 'x' }, undefined), null, 'an unresolved league is closed');

  // ── The MERGED block: the numbers stop leaving things out ────────────────
  // ⚠ The case that put this here: Valverde read `0 GOALS` two days after
  // scoring in the Champions League. The number was right and the screen was
  // misleading, which is the worse failure. ADR 0148 named the gap in a line;
  // ADR 0149 closes it, because the backend now serves the merge.
  const vLal = pickPlayerSeason(valverde, LA_LIGA, SEASON);
  assert.equal(vLal.goals, 0, 'his LaLiga block really is 0 goals — the app was right');
  assert.equal(vLal.assists, 1);
  assert.deepEqual(
    valverde.seasons
      .filter((s) => s.season === SEASON)
      .map((s) => `${s.competition}:${s.goals}`),
    ['champions-league:1', 'laliga:0'],
    'and the goal he actually scored is in the block the CHARTS still do not draw');

  const vAll = pickPlayerTotals(valverde, SEASON);
  assert.ok(vAll, 'the payload carries seasonTotals — re-capture it if this fails');
  assert.equal(vAll.goals, 1, '⚠ THE ACCEPTANCE ASSERTION: the headline reads 1, not 0');
  assert.equal(vAll.assists, 1, 'and the assist is not double-counted');
  assert.equal(vAll.goalInvolvements, 2, 'involvements are SERVED, not re-added');
  assert.deepEqual(vAll.competitions, ['champions-league', 'laliga'],
    'the merge names what it folded in, slug-ascending');

  // ⚠⚠ A perfect ratio and still refused: `sufficient` is an AND across the
  // contributing competitions, not a ratio. Recomputing it client-side is the
  // laundering the backend exists to prevent.
  assert.equal(vAll.coverage.ratio, 1, '5 of 5 fixtures counted — a perfect ratio…');
  assert.equal(vAll.coverage.sufficient, false,
    '…and STILL refused, because the UCL half is one fixture, under the floor of 3');
  assert.equal(vAll.goalsByBand, null, 'so everything derived is null…');
  assert.equal(vAll.goals, 1, '…while the raw counter is served regardless');
  assert.equal(pickPlayerSeason(valverde, LA_LIGA, SEASON).coverage.sufficient, true,
    '⚠ and the LaLiga block IS sufficient — which is why the charts read it');

  // ⚠ There is no merged `goalsByMatchweek` and none is coming.
  assert.equal(vAll.goalsByMatchweek, undefined,
    'a merged block has NO goalsByMatchweek — matchweeks are per-competition');
  assert.equal(vAll.currentScoringStreak, undefined, 'and no currentScoringStreak');

  // ⚠ Same season only — a merged block is ONE season. Folding 2025 in would
  // restate a career total as a season one (0148's rule, still true).
  assert.ok(valverde.seasons.some((s) => s.season === 2025 && s.goals === 3),
    'the fixture does carry a 2025 block with goals in it…');
  assert.equal(vAll.season, SEASON, '…and the merged block is 2026 alone');
  assert.ok(valverde.seasonTotals.length > 1, 'the 2025 merge is a SEPARATE row');
  assert.ok(
    valverde.seasonTotals.every((a, i, xs) => i === 0 || xs[i - 1].season > a.season),
    'seasonTotals is newest-first, strictly descending');

  const rAll = pickPlayerTotals(raphinha, SEASON);
  assert.equal(rAll.goals, 8, 'Raphinha merges 6 LaLiga + 2 UCL');
  assert.equal(pickPlayerSeason(raphinha, LA_LIGA, SEASON).goals, 6,
    'and his LaLiga block — what the charts draw — stays 6');
  assert.equal(rAll.longestScoringStreak, 4,
    '⚠ a MAX across competitions, so a LOWER BOUND — never printed as an ' +
    'all-competitions streak');

  // ── The club merges further, because it has a merged TIMELINE ────────────
  const bAll = pickTeamTotals(barca, SEASON);
  assert.equal(bAll.goalsFor, 22, 'Barcelona merges 17 LaLiga + 5 UCL');
  assert.equal(pickTeamSeason(barca, LA_LIGA, SEASON).goalsFor, 17,
    'and the LaLiga block stays 17 — the matchweek bars still sum to this');
  assert.equal(bAll.timeline.length, 5, 'the merged timeline interleaves both');
  assert.equal(bAll.home.played + bAll.away.played, bAll.timeline.length,
    '⚠ a free structural check: the venue split accounts for every fixture');
  assert.ok(
    bAll.timeline.every((e, i, xs) => i === 0 || xs[i - 1].ko <= e.ko),
    'and it is KICKOFF-ordered, which is what makes the club runs mergeable');
  assert.equal(cumulativeGoals(bAll.timeline).at(-1), bAll.goalsFor,
    'so the cumulative line lands exactly on the merged total');

  // ⚠⚠ **The trap, PROVEN rather than described.** Two competitions' matchday 1s
  // are two different nights. `goalsByMatchweek` cannot see that — a merged entry
  // is structurally assignable — so it folds them into one bar. This assertion
  // records the wrong answer so nobody "fixes" the club view by passing the
  // merged array to it.
  const md1 = bAll.timeline.filter((e) => e.mw === 1);
  assert.equal(md1.length, 2, 'the merged timeline really does carry two mw:1 fixtures');
  assert.notDeepEqual(md1[0].competition, md1[1].competition,
    'in DIFFERENT competitions — that is what makes the label a lie');
  const merged1 = goalsByMatchweek(bAll.timeline).find((w) => w.mw === 1);
  const league1 = goalsByMatchweek(pickTeamSeason(barca, LA_LIGA, SEASON).timeline)
    .find((w) => w.mw === 1);
  assert.equal(
    merged1.home + merged1.away,
    md1[0].gf + md1[1].gf,
    'and fed the merged array, goalsByMatchweek ADDS both nights into one bar…');
  assert.notEqual(merged1.home + merged1.away, league1.home + league1.away,
    '…which is not the LaLiga matchday 1 the card claims to draw');

  // ⚠⚠ The run CAPTION, caught on a device and not in review: Barcelona's merged
  // run spans LaLiga matchday 2 through Champions League matchday 1, so the
  // matchweek template renders "MD2 → MD1" — a run that appears to travel
  // backwards. Both ends carry real matchweeks, so nothing about the data says
  // "fall back"; only the fact that they are different NAMESPACES does.
  assert.equal(bAll.scoringRun.fromMatchweek, 2);
  assert.equal(bAll.scoringRun.toMatchweek, 1,
    'the merged run really does end on a LOWER matchweek than it starts');
  assert.equal(runLabel(bAll.scoringRun).kind, 'matchweeks',
    'so the unflagged caption would happily print MD2 → MD1…');
  assert.equal(runLabel(bAll.scoringRun, true).kind, 'dates',
    '…and a namespaced run must caption with kickoffs instead');
  assert.equal(runLabel(pickTeamSeason(barca, LA_LIGA, SEASON).scoringRun).kind,
    'matchweeks', '⚠ while a single-competition run still captions with matchweeks');

  // ── A single-competition merge IS the league block ───────────────────────
  // ⚠ The common case outside Europe, and the reason nothing may be labelled
  // "all competitions" unconditionally.
  const byAll = pickTeamTotals(bayern, SEASON);
  assert.deepEqual(byAll.competitions, ['bundesliga'], 'Bayern plays one competition');
  const byLeague = pickTeamSeason(bayern, BUNDESLIGA, SEASON);
  assert.equal(byAll.goalsFor, byLeague.goalsFor, 'so its merged block IS its league block');
  assert.equal(byAll.timeline.length, byLeague.timeline.length);
  assert.equal(byAll.yellows, null, 'and it still writes no events at all');

  // ── The scope line: what the figures count and the charts leave out ──────
  assert.deepEqual(chartsExclude(bAll, LA_LIGA), ['champions-league'],
    'so the charts say "LaLiga matches only"');
  assert.deepEqual(chartsExclude(byAll, BUNDESLIGA), [],
    '⚠ and a single-competition merge draws NO scope line — there is no gap');
  assert.deepEqual(chartsExclude(vAll, LA_LIGA), ['champions-league']);
  assert.deepEqual(chartsExclude(bAll, undefined), [],
    'an unresolved league says nothing rather than listing every competition');
  assert.deepEqual(chartsExclude(null, LA_LIGA), [],
    'and a pre-§120.15 payload with no merged block says nothing either');

  // ⚠ The pickers take a SEASON and no league — a merged block is not
  // per-competition, so asking for "the merged laliga block" is a category error.
  assert.equal(pickTeamTotals(barca, 1999), null, 'a season with no row is null');
  assert.equal(pickTeamTotals(null, SEASON), null);
  assert.equal(pickPlayerTotals(undefined, SEASON), null);
  assert.equal(pickPlayerTotals({ seasons: [] }, SEASON), null,
    'a payload with no seasonTotals key at all is null, not a crash');

  // ── The header denominator, for completeness ─────────────────────────────
  assert.equal(roundCount(LA_LIGA), 38);
  assert.equal(roundCount(BUNDESLIGA), 34, 'never hard-coded — 2 × (clubCount − 1)');

  console.log('season-stats harness: all assertions pass');
} finally {
  rmSync(out, { recursive: true, force: true });
}
