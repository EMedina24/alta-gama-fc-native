/**
 * Plain-node harness for `features/standings/snapshot.ts` — the pure half of
 * the STANDINGS widget (ADR 0185).
 *
 * Run: `node scripts/standings-widget-harness.mjs`.
 *
 * Every rule here renders as a table that looks entirely normal when it is
 * wrong, so none of them would be caught by a screenshot:
 *
 *   1. **A band on an unbandable table.** The tile decides nothing — it paints
 *      `band`. So `bandsApply` / `cupBandsApply` have to have been asked HERE,
 *      and an unplayed table must arrive with no band on any row.
 *   2. **The Champions League window.** 36 rows into 20 slots, keeping every
 *      followed club and giving the seam a slot of its own. An off-by-one here
 *      is a 21-row tile that clips its last row, or a followed club silently cut.
 *   3. **The hairlines.** Data-driven, not "above 7 and 18": the three European
 *      places are ONE group, the league phase's three bands are three.
 *   4. **The crest decode path.** Rasters (WebP included) decode directly; an
 *      SVG-only club takes the SVG path, and a club with both takes the raster.
 *   5. **The reload guard.** `writtenAt` alone must not change the key (trap 34).
 *
 * ⚠ Fixtures are REAL production payloads captured 2026-09-17 from
 * `crono-gol.com` (standings, the LaLiga matchweek index, two crest sets) plus
 * the 2026-09-11 `ucl-standings-2026.json` — trap 48: a field a sample invents
 * is a field the test cannot check.
 *
 * The transpile-and-require mechanics are `ucl-standings-harness.mjs`'s.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'agfc-standings-widget-harness-'));

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
        join(repo, 'src/features/standings/snapshot.ts'),
        join(repo, 'src/lib/i18n/copy.ts'),
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

  const {
    STANDINGS_SLOTS,
    buildStandingsSnapshot,
    crestFileName,
    standingsSnapshotKey,
    windowRows,
  } = require(join(out, 'features/standings/snapshot.js'));
  const { COPY } = require(join(out, 'lib/i18n/copy.js'));

  const standings = load('standings-2026.json');
  const ucl = load('ucl-standings-2026.json');
  const laligaIndex = load('jornadas-laliga-2026.json');
  const now = new Date('2026-09-17T12:00:00Z');

  const inputs = (over = {}) => ({
    tables: standings.tables,
    ucl,
    jornadas: { laliga: laligaIndex },
    followed: [],
    leagueSlug: 'la-liga',
    crests: new Map(),
    ...over,
  });
  const byslug = (snap, slug) => snap.tables.find((t) => t.slug === slug);

  /* ── Fixture guard ──────────────────────────────────────────────────────── */
  console.log('\nfixture');
  ok('holds six configured leagues plus segunda, all played', () => {
    const slugs = standings.tables.map((t) => t.league.slug).sort();
    assert.deepEqual(slugs, [
      'bundesliga', 'laliga', 'liga-nacional-apertura', 'lpr-pro-clausura',
      'premier-league', 'segunda', 'serie-a',
    ]);
    const laliga = standings.tables.find((t) => t.league.slug === 'laliga');
    assert.equal(laliga.clubs, 20);
    assert.ok(laliga.matchesPlayed > 0);
    assert.equal(ucl.rows.length, 36);
  });

  /* ── Tables ─────────────────────────────────────────────────────────────── */
  console.log('\nbuildStandingsSnapshot — which tables, in which order');
  const base = buildStandingsSnapshot(inputs(), now, COPY.en);
  ok('seven tables, editorial order, cup second, no segunda', () => {
    assert.deepEqual(
      base.tables.map((t) => t.slug),
      ['la-liga', 'champions-league', 'premier-league', 'bundesliga', 'serie-a',
        ...base.tables.slice(5).map((t) => t.slug)],
    );
    assert.equal(base.tables.length, 7);
    assert.ok(!base.tables.some((t) => t.slug === 'segunda'));
  });
  ok('row counts are the real field sizes (20/18/12/11), the cup windowed to 20', () => {
    assert.equal(byslug(base, 'la-liga').rows.length, 20);
    assert.equal(byslug(base, 'bundesliga').rows.length, 18);
    assert.equal(byslug(base, 'liga-nacional-apertura').rows.length, 12);
    assert.equal(byslug(base, 'lpr-pro-clausura').rows.length, 11);
    assert.equal(byslug(base, 'champions-league').rows.length, STANDINGS_SLOTS);
  });
  ok('the cup is OMITTED, not emptied, when its table has not loaded', () => {
    const snap = buildStandingsSnapshot(inputs({ ucl: null }), now, COPY.en);
    assert.equal(snap.tables.length, 6);
    assert.ok(!byslug(snap, 'champions-league'));
  });
  ok('url opens the Table tab on the ROUTE slug', () => {
    assert.equal(byslug(base, 'la-liga').url, 'altagamafc://table?league=la-liga');
    assert.equal(byslug(base, 'champions-league').url, 'altagamafc://table?league=champions-league');
  });
  ok('defaultSlug is the app pick, falling back to the first table', () => {
    assert.equal(base.defaultSlug, 'la-liga');
    assert.equal(buildStandingsSnapshot(inputs({ leagueSlug: 'serie-a' }), now, COPY.en).defaultSlug, 'serie-a');
    assert.equal(buildStandingsSnapshot(inputs({ leagueSlug: 'ligue-1' }), now, COPY.en).defaultSlug, 'la-liga');
  });

  /* ── Meta line ──────────────────────────────────────────────────────────── */
  console.log('\nmeta — the Table tab caption, eyebrow-short');
  ok('LaLiga reads its completed matchweek off its own index, EN and ES', () => {
    const en = byslug(base, 'la-liga').meta;
    const es = byslug(buildStandingsSnapshot(inputs(), now, COPY.es), 'la-liga').meta;
    console.log(`      en ${en} · es ${es}`);
    assert.match(en, /^LALIGA( · AFTER MD \d+)?$/);
    assert.match(es, /^LALIGA( · TRAS J\d+)?$/);
  });
  ok('a league with no index prints its name alone — never an invented round', () => {
    assert.equal(byslug(base, 'premier-league').meta, 'PREMIER LEAGUE');
  });
  ok('the cup prints the server matchday verbatim', () => {
    assert.equal(byslug(base, 'champions-league').meta, `CHAMPIONS LEAGUE · AFTER MD ${ucl.matchday}`);
  });

  /* ── Bands ──────────────────────────────────────────────────────────────── */
  console.log('\nbands — policy decided here, painted there');
  ok('LaLiga: 1-5 ucl, 6 uel, 7 conf, 18-20 rel, rest null', () => {
    const bands = byslug(base, 'la-liga').rows.map((r) => r.band);
    assert.deepEqual(bands.slice(0, 7), ['ucl', 'ucl', 'ucl', 'ucl', 'ucl', 'uel', 'conf']);
    assert.ok(bands.slice(7, 17).every((b) => b === null));
    assert.deepEqual(bands.slice(17), ['rel', 'rel', 'rel']);
  });
  ok('an UNPLAYED table carries no band on any row (trap 20)', () => {
    const unplayed = standings.tables.map((t) =>
      t.league.slug === 'laliga' ? { ...t, matchesPlayed: 0 } : t,
    );
    const snap = buildStandingsSnapshot(inputs({ tables: unplayed }), now, COPY.en);
    assert.ok(byslug(snap, 'la-liga').rows.every((r) => r.band === null && !r.ruleAbove));
  });
  ok('a SHORT table carries no band either', () => {
    const short = standings.tables.map((t) =>
      t.league.slug === 'laliga' ? { ...t, clubs: 19 } : t,
    );
    const snap = buildStandingsSnapshot(inputs({ tables: short }), now, COPY.en);
    assert.ok(byslug(snap, 'la-liga').rows.every((r) => r.band === null));
  });
  ok('the cup bands by cupBandFor, and not at all while unplayed', () => {
    const rows = byslug(base, 'champions-league').rows;
    assert.equal(rows[0].band, 'r16');
    assert.equal(rows[8].band, 'playoff');
    const snap = buildStandingsSnapshot(inputs({ ucl: { ...ucl, lastMatchUtc: null } }), now, COPY.en);
    assert.ok(byslug(snap, 'champions-league').rows.every((r) => r.band === null));
  });

  /* ── Rules ──────────────────────────────────────────────────────────────── */
  console.log('\nruleAbove — where the band GROUP changes');
  ok('LaLiga rules above 8th and 18th only (Europe is one group)', () => {
    const ruled = byslug(base, 'la-liga').rows.filter((r) => r.ruleAbove).map((r) => r.rank);
    assert.deepEqual(ruled, [8, 18]);
  });
  ok('Serie A rules above 8th and 18th', () => {
    const ruled = byslug(base, 'serie-a').rows.filter((r) => r.ruleAbove).map((r) => r.rank);
    assert.deepEqual(ruled, [8, 18]);
  });
  ok('Bundesliga rules above 7th and 17th', () => {
    const ruled = byslug(base, 'bundesliga').rows.filter((r) => r.ruleAbove).map((r) => r.rank);
    assert.deepEqual(ruled, [7, 17]);
  });
  ok('a zoneless league (Honduras) has no rules at all', () => {
    assert.ok(byslug(base, 'liga-nacional-apertura').rows.every((r) => !r.ruleAbove));
  });
  ok('the cup, unwindowed, rules above 9th only (25th is past the cut)', () => {
    const ruled = byslug(base, 'champions-league').rows.filter((r) => r.ruleAbove).map((r) => r.rank);
    assert.deepEqual(ruled, [9]);
  });

  /* ── Window ─────────────────────────────────────────────────────────────── */
  console.log('\nwindowRows — 36 into 20 slots');
  const flags = (ranks) => Array.from({ length: 36 }, (_, i) => ranks.includes(i + 1));
  const slotsUsed = (w) => w.indexes.length + (w.seamBefore === null ? 0 : 1);
  ok('nothing followed below the cut → top 20, no seam', () => {
    const w = windowRows(flags([3]));
    assert.deepEqual(w.indexes, [...Array(20).keys()]);
    assert.equal(w.seamBefore, null);
  });
  ok('followed at 3, 22 and 35 → head 17, seam, 22, 35 — exactly 20 slots', () => {
    const w = windowRows(flags([3, 22, 35]));
    assert.deepEqual(w.indexes, [...Array(17).keys(), 21, 34]);
    assert.equal(w.seamBefore, 21);
    assert.equal(slotsUsed(w), 20);
  });
  ok('a followed club exactly AT the cut (21st) takes the fixed point', () => {
    const w = windowRows(flags([21]));
    assert.equal(slotsUsed(w), 20);
    assert.ok(w.indexes.includes(20));
  });
  ok('the head shrink can pull a club back ABOVE the seam', () => {
    // 19 is inside a 20 head, but 21 pushes the head to 18 — 19 falls below.
    const w = windowRows(flags([19, 21]));
    assert.ok(w.indexes.includes(18) && w.indexes.includes(20));
    assert.equal(slotsUsed(w), 20);
  });
  ok('following more clubs than slots never overflows', () => {
    const w = windowRows(flags(Array.from({ length: 30 }, (_, i) => i + 5)));
    assert.ok(slotsUsed(w) <= 20);
    assert.equal(w.indexes[0], 0);
  });
  ok('a real snapshot: the seam row has seamAbove, and no rule under it', () => {
    const followed = [ucl.rows[2], ucl.rows[21], ucl.rows[34]].map((r) => r.team.slug);
    const rows = byslug(buildStandingsSnapshot(inputs({ followed }), now, COPY.en), 'champions-league').rows;
    assert.equal(rows.length, 19);
    const seam = rows.find((r) => r.seamAbove);
    assert.equal(seam.rank, 22);
    assert.equal(seam.ruleAbove, false);
    assert.deepEqual(rows.filter((r) => r.followed).map((r) => r.rank), [3, 22, 35]);
    // 35th is `out`, 22nd `playoff`: the group change still rules between them.
    assert.equal(rows.find((r) => r.rank === 35).ruleAbove, true);
  });

  /* ── Rows ───────────────────────────────────────────────────────────────── */
  console.log('\nrows — pre-formatted for a widget that only prints');
  ok('goal difference is signed, zero bare', () => {
    for (const row of byslug(base, 'la-liga').rows) {
      assert.match(row.goalDiff, /^(\+[1-9]\d*|-[1-9]\d*|0)$/);
    }
  });
  ok('names are the Table tab\'s displayName — never a last-word collapse', () => {
    // ⚠ `widgetName` printed `Madrid` for Atlético and a second `Barcelona` for
    // Espanyol on the first render. The bound is a tripwire, not the layout
    // limit; the longest real name is printed for the render jig.
    let longest = '';
    for (const table of base.tables) {
      for (const row of table.rows) {
        assert.ok(row.name.length > 0 && row.name.length <= 26, `${row.teamSlug} → ${row.name}`);
        assert.ok(row.abbr.length > 0);
        if (row.name.length > longest.length) longest = row.name;
      }
    }
    console.log(`      longest: ${longest}`);
    const laliga = byslug(base, 'la-liga').rows.map((r) => r.name);
    assert.equal(new Set(laliga).size, laliga.length, 'two rows share a name');
    assert.ok(laliga.includes('Atlético de Madrid') && laliga.includes('Espanyol de Barcelona'));
  });
  ok('crestFile comes only from the map — never guessed', () => {
    const crests = new Map([['barcelona', 'barcelona.abc.png']]);
    const rows = byslug(buildStandingsSnapshot(inputs({ crests }), now, COPY.en), 'la-liga').rows;
    const barca = rows.find((r) => r.teamSlug === 'barcelona');
    if (barca) assert.equal(barca.crestFile, 'barcelona.abc.png');
    assert.ok(rows.filter((r) => r.teamSlug !== 'barcelona').every((r) => r.crestFile === null));
  });

  /* ── Crests ─────────────────────────────────────────────────────────────── */
  console.log('\ncrestFileName — which decode path');
  ok('every Serie A crest (WebP) gets a hashed .png name off a .webp URL', () => {
    for (const crest of load('crests-serie-a.json').crests) {
      const target = crestFileName(crest);
      assert.ok(target, crest.slug);
      assert.match(target.name, new RegExp(`^${crest.slug}\\.[a-z0-9]{1,12}\\.png$`));
      assert.match(target.url, /\.webp$/);
      assert.equal(target.decode, 'raster');
    }
  });
  ok('every Bundesliga crest (SVG only) takes the SVG path — never a tile', () => {
    for (const crest of load('crests-bundesliga.json').crests) {
      const target = crestFileName(crest);
      assert.ok(target, crest.slug);
      assert.equal(target.decode, 'svg');
      assert.match(target.name, /\.png$/);
    }
  });
  ok('a crest with no artwork at all is refused', () => {
    assert.equal(crestFileName({ slug: 'x', name: 'X', shortName: 'X', format: null, logoUrl: null, logoUrls: null }), null);
  });
  ok('a PNG set with an svg key still picks a raster', () => {
    const target = crestFileName({
      slug: 'arsenal', name: 'Arsenal', shortName: 'ARS', format: 'png',
      logoUrl: 'https://x/crests/aaa.png',
      logoUrls: { svg: 'https://x/crests/bbb.svg', '50': 'https://x/crests/ccc111.png' },
    });
    assert.equal(target.url, 'https://x/crests/ccc111.png');
    assert.equal(target.decode, 'raster');
    assert.equal(target.name, 'arsenal.ccc111.png');
  });

  /* ── Key ────────────────────────────────────────────────────────────────── */
  console.log('\nstandingsSnapshotKey — the reload guard');
  ok('writtenAt alone does not change the key', () => {
    const later = buildStandingsSnapshot(inputs(), new Date('2026-09-18T12:00:00Z'), COPY.en);
    assert.equal(standingsSnapshotKey(base), standingsSnapshotKey(later));
  });
  ok('a follow, a crest landing, or a language switch does', () => {
    const k = standingsSnapshotKey(base);
    const slug = standings.tables.find((t) => t.league.slug === 'laliga').rows[0].team.slug;
    assert.notEqual(k, standingsSnapshotKey(buildStandingsSnapshot(inputs({ followed: [slug] }), now, COPY.en)));
    assert.notEqual(k, standingsSnapshotKey(buildStandingsSnapshot(inputs({ crests: new Map([[slug, 'a.png']]) }), now, COPY.en)));
    assert.notEqual(k, standingsSnapshotKey(buildStandingsSnapshot(inputs(), now, COPY.es)));
  });

  console.log(`\n${passed} assertions passed\n`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
