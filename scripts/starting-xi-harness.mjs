/**
 * Plain-node harness for the Starting XI core (ADR 0211–0214).
 *
 * Run: `node scripts/starting-xi-harness.mjs`.
 *
 * What it proves, and why each needs proving rather than reading:
 *
 * - **Slots and the ladder equal the handoff's own functions.** `handoff_lineup/
 *   xi-data.js` is imported and run — its `FORMATION_SLOTS`, `geometry()` and
 *   `bandOf` are the oracle, not a transcription of them.
 * - **The three repositories agree** on every formation's slot ids and order.
 *   The web (`cronogol`) and the backend (`senpai-backend`) each keep a hand
 *   copy; a disagreement does not error anywhere, it seats the right players
 *   in the wrong slots. Skipped with a warning when a sibling is absent.
 * - **The reducer's every placement case**, the formation re-seat, save
 *   validity, load pruning, and that an unloaded squad never prunes anyone.
 * - **The v1 → v2 migration** renames 4-2-3-1's three slots and ONLY 4-2-3-1's.
 * - **The camera.** `projectPoint` must BE the native transform or every token
 *   floats off its slot. It is checked against (1) a port of React Native's
 *   `Transform::operator*` folding `planeOps`' own output, and (2) an
 *   independent column-vector model of the handoff's CSS scene.
 * - **Stats** read the season by value and hide yellows below the coverage
 *   floor, on real captured payloads.
 * - **The club directory** drops LaLiga's segunda clubs and offers only
 *   squad-publishing leagues, on the captured standings.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'agfc-xi-harness-'));
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
let checks = 0;
const ok = (value, message) => {
  assert.ok(value, message);
  checks += 1;
};
const eq = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message);
  checks += 1;
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
        noImplicitAny: false,
        paths: { '@/*': [join(repo, 'src/*')] },
      },
      files: [
        join(repo, 'src/features/starting-xi/slots.ts'),
        join(repo, 'src/features/starting-xi/pitch-geometry.ts'),
        join(repo, 'src/features/starting-xi/projection.ts'),
        join(repo, 'src/features/starting-xi/xi-state.ts'),
        join(repo, 'src/features/starting-xi/migrate.ts'),
        join(repo, 'src/features/starting-xi/stats.ts'),
        join(repo, 'src/features/starting-xi/clubs.ts'),
        join(repo, 'src/lib/limit.ts'),
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
  const load = (path) => require(join(out, path));

  const slots = load('features/starting-xi/slots.js');
  const geo = load('features/starting-xi/pitch-geometry.js');
  const cam = load('features/starting-xi/projection.js');
  const xi = load('features/starting-xi/xi-state.js');
  const mig = load('features/starting-xi/migrate.js');
  const stats = load('features/starting-xi/stats.js');
  const clubs = load('features/starting-xi/clubs.js');
  const { createLimiter } = load('lib/limit.js');
  const { LEAGUES, findLeague } = load('lib/cronogol/leagues.js');

  // The handoff's data module, run as the oracle. Copied to `.mjs` so node
  // loads it as ESM whatever the folder's package type.
  const oraclePath = join(out, 'xi-data.mjs');
  copyFileSync(join(repo, 'handoff_lineup/xi-data.js'), oraclePath);
  const oracle = await import(pathToFileURL(oraclePath).href);

  /* ── 1 · Slots ─────────────────────────────────────────────────────────── */

  eq([...slots.FORMATION_IDS], oracle.FORMATION_IDS, 'formation ids and order match the handoff');
  for (const id of slots.FORMATION_IDS) {
    eq([...slots.FORMATION_SLOTS[id]], oracle.FORMATION_SLOTS[id], `${id}: slot ids and order match the handoff`);
    eq(new Set(slots.FORMATION_SLOTS[id]).size, 11, `${id}: eleven distinct slots`);
    for (const slot of slots.FORMATION_SLOTS[id]) {
      eq(slots.bandOf(slot), oracle.bandOf(slot), `bandOf(${slot}) matches the handoff`);
    }
    eq(slots.FORMATION_SLOTS[id][0], 'GK', `${id}: keeper first`);
  }
  eq(slots.FORMATION_SLOTS['4-2-3-1'].slice(7, 10), ['LM', 'AM', 'RM'], "4-2-3-1 uses the three repos' LM/AM/RM");

  /* ── 2 · The three repositories agree ──────────────────────────────────── */

  const literalAfter = (source, marker) => {
    const at = source.indexOf(marker);
    if (at < 0) return null;
    const open = source.indexOf('{', source.indexOf('=', at));
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth += 1;
      if (source[i] === '}') depth -= 1;
      if (depth === 0) return new Function(`return (${source.slice(open, i + 1)});`)();
    }
    return null;
  };

  const webGeometry = join(repo, '../cronogol/components/starting-xi/geometry.ts');
  if (existsSync(webGeometry)) {
    const shapes = literalAfter(readFileSync(webGeometry, 'utf8'), 'const SHAPES');
    ok(shapes, 'parsed the web SHAPES literal');
    for (const id of slots.FORMATION_IDS) {
      eq(shapes[id], slots.FORMATION_BANDS[id].map((band) => [...band]), `${id}: bands match cronogol`);
    }
  } else {
    console.warn('⚠ cronogol not checked out beside this repo — web formation diff skipped');
  }

  const backendSlots = join(repo, '../senpai-backend/src/cronogol/ig-xi-formations.ts');
  if (existsSync(backendSlots)) {
    const table = literalAfter(readFileSync(backendSlots, 'utf8'), 'export const FORMATION_SLOTS');
    ok(table, 'parsed the backend FORMATION_SLOTS literal');
    for (const id of slots.FORMATION_IDS) {
      eq(table[id], [...slots.FORMATION_SLOTS[id]], `${id}: wire order matches senpai-backend`);
    }
  } else {
    console.warn('⚠ senpai-backend not checked out beside this repo — backend formation diff skipped');
  }

  /* ── 3 · The ladder ────────────────────────────────────────────────────── */

  for (const id of slots.FORMATION_IDS) {
    const ours = geo.pitchSlots(id);
    const theirs = oracle.geometry(id);
    eq(ours.length, 11, `${id}: eleven on the pitch`);
    ours.forEach((slot, i) => {
      eq(slot.id, theirs[i].id, `${id}[${i}] id`);
      ok(near(slot.x, theirs[i].x) && near(slot.y, theirs[i].y), `${id} ${slot.id}: at the handoff's x/y`);
    });
    eq(ours.map((s) => s.id), [...slots.FORMATION_SLOTS[id]], `${id}: pitch order is the slot order`);
  }
  eq(geo.toPlane({ x: 50, y: 9 }), { ux: 260, uy: 728 }, 'the keeper stands 9% up from the bottom edge');
  eq(
    [1, 2, 3, 4, 5].map((n) => Math.round(geo.laneGap(n) * 10) / 10),
    [520, 166.4, 161.2, 130, 106.6],
    'lane gaps per row size, in plane units',
  );

  // The export card keeps its hand-measured table (ADR 0213) — same ids, same
  // order, and every table still passes the spacing rule it was measured to.
  const card = load('features/starting-xi/card-geometry.js');
  for (const id of slots.FORMATION_IDS) {
    eq(card.CARD_SLOTS[id].map((s) => s.id), [...slots.FORMATION_SLOTS[id]], `${id}: the card's slot ids are the pitch's`);
    eq(card.spacingViolations(card.CARD_SLOTS[id]), [], `${id}: the card table keeps its spacing rule`);
  }
  eq(card.orbInitials({ name: 'Pedro González López', shortName: 'Pedri' }), 'PE', 'one word → its first two letters');
  eq(card.orbInitials({ name: 'Lamine Yamal Nasraoui Ebana', shortName: 'Lamine Yamal' }), 'LY');
  eq(card.orbInitials({ name: 'Cotto Martínez, Luis Alejandro', shortName: null }), 'CM', 'a surname-first name reads its surname half');
  eq(card.orbInitials({ name: "N'Golo Kanté", shortName: "N'Golo Kanté" }), 'NK', 'letters only — the apostrophe is not a letter');
  eq(card.orbInitials({ name: "N'Golo Kanté", shortName: null }), 'KA', 'no short name: the family name, as the name pill shows');

  /* ── 4 · The reducer ───────────────────────────────────────────────────── */

  // A 4-3-3's worth of players plus spares, with bands.
  const roster = [
    ['gk1', 'GK'], ['gk2', 'GK'],
    ['d1', 'DEF'], ['d2', 'DEF'], ['d3', 'DEF'], ['d4', 'DEF'], ['d5', 'DEF'],
    ['m1', 'MID'], ['m2', 'MID'], ['m3', 'MID'], ['m4', 'MID'], ['m5', 'MID'],
    ['f1', 'FWD'], ['f2', 'FWD'], ['f3', 'FWD'], ['f4', 'FWD'],
  ];
  const squad = new Map(roster.map(([id, position]) => [id, { position }]));
  const run = (state, ...actions) => {
    let s = state;
    let effect = null;
    for (const action of actions) ({ state: s, effect } = xi.reduceXi(s, action, squad));
    return { state: s, effect };
  };
  const full433 = {
    ...xi.EMPTY_CLUB,
    placements: { GK: 'gk1', LB: 'd1', LCB: 'd2', RCB: 'd3', RB: 'd4', LCM: 'm1', CM: 'm2', RCM: 'm3', LW: 'f1', ST: 'f2', RW: 'f3' },
  };

  // place: squad → empty
  let r = run(xi.EMPTY_CLUB, { type: 'place', slot: 'GK', id: 'gk1' });
  eq(r.effect, 'placed', 'squad → empty slot is "placed"');
  eq(r.state.placements, { GK: 'gk1' });

  // place: into the slot he already holds is a no-op
  r = run(r.state, { type: 'place', slot: 'GK', id: 'gk1' });
  eq(r.effect, null, 'placing a player where he already is changes nothing');

  // place: a slot the formation lacks is refused
  eq(run(xi.EMPTY_CLUB, { type: 'place', slot: 'AM', id: 'm1' }).effect, null, '4-3-3 has no AM');

  // place: squad → occupied, bench has room → occupant benched
  r = run(full433, { type: 'place', slot: 'GK', id: 'gk2' });
  eq(r.effect, 'placed');
  eq(r.state.placements.GK, 'gk2');
  eq(r.state.bench, ['gk1'], 'the displaced keeper goes to the bench');

  // place: squad → occupied, bench full → occupant back to the pool
  const fullBench = { ...full433, bench: ['gk2', 'd5', 'm4', 'm5', 'f4', 'x1', 'x2'] };
  const squadX = new Map([...squad, ['x1', { position: 'MID' }], ['x2', { position: 'MID' }], ['x3', { position: 'FWD' }]]);
  let rx = xi.reduceXi(fullBench, { type: 'place', slot: 'ST', id: 'x3' }, squadX);
  eq(rx.state.placements.ST, 'x3');
  eq(rx.state.bench.length, 7, 'a full bench stays at seven');
  ok(xi.whereIs(rx.state, 'f2') === null, 'with no room, the displaced striker returns to the pool');

  // place: slot ↔ slot is a true swap
  r = run(full433, { type: 'place', slot: 'LW', id: 'f3' });
  eq(r.effect, 'swapped');
  eq([r.state.placements.LW, r.state.placements.RW], ['f3', 'f1'], 'LW and RW swapped');

  // place: bench ↔ slot swaps in place (the occupant takes his bench cell)
  const benched = { ...full433, bench: ['gk2', 'f4', 'm4'] };
  r = run(benched, { type: 'place', slot: 'ST', id: 'f4' });
  eq(r.effect, 'swapped');
  eq(r.state.bench, ['gk2', 'f2', 'm4'], "the striker takes the sub's bench cell, not the end");

  // place: bench → empty slot just moves him
  r = run({ ...xi.EMPTY_CLUB, bench: ['m4'] }, { type: 'place', slot: 'CM', id: 'm4' });
  eq([r.effect, r.state.bench, r.state.placements.CM], ['placed', [], 'm4']);

  // toBench
  r = run(full433, { type: 'toBench', id: 'f2' });
  eq([r.effect, r.state.bench, r.state.placements.ST], ['benched', ['f2'], undefined]);
  eq(run(r.state, { type: 'toBench', id: 'f2' }).effect, null, 'already benched is a no-op');
  rx = xi.reduceXi(fullBench, { type: 'toBench', id: 'f2' }, squadX);
  eq(rx.effect, null, 'a full bench refuses an eighth');
  eq(rx.state.placements.ST, 'f2', 'and the player stays where he was');

  // unplace
  r = run(benched, { type: 'unplace', id: 'gk2' });
  eq([r.effect, r.state.bench], ['removed', ['f4', 'm4']]);
  eq(run(xi.EMPTY_CLUB, { type: 'unplace', id: 'gk1' }).effect, null);

  // mirror
  r = run(full433, { type: 'mirror' });
  eq(r.effect, 'mirrored');
  eq(
    [r.state.placements.LB, r.state.placements.RB, r.state.placements.LW, r.state.placements.RW, r.state.placements.GK, r.state.placements.ST, r.state.placements.CM],
    ['d4', 'd1', 'f3', 'f1', 'gk1', 'f2', 'm2'],
    'rows flip; GK, CM and ST stay put',
  );
  eq(run(r.state, { type: 'mirror' }).state.placements, full433.placements, 'mirror is an involution');
  eq(run(xi.EMPTY_CLUB, { type: 'mirror' }).effect, null, 'an empty pitch does not mirror');
  eq(run({ ...xi.EMPTY_CLUB, placements: { GK: 'gk1', ST: 'f2' } }, { type: 'mirror' }).effect, null, 'a symmetric pitch is unchanged');

  // clear
  r = run(benched, { type: 'clear' });
  eq([r.effect, r.state.placements, r.state.bench, r.state.loadedId], ['cleared', {}, [], null]);
  eq(run(xi.EMPTY_CLUB, { type: 'clear' }).effect, null);

  // setFormation — 4-3-3 → 3-5-2, full XI
  r = run(full433, { type: 'setFormation', formation: '3-5-2' });
  eq(r.effect, 'reshaped');
  eq(r.state.formation, '3-5-2');
  eq(
    r.state.placements,
    { GK: 'gk1', LCB: 'd2', RCB: 'd3', CB: 'd1', LCM: 'm1', CM: 'm2', RCM: 'm3', LST: 'f1', RST: 'f2' },
    'kept ids stay; LB → CB; LW/ST → LST/RST; LM and RM open',
  );
  eq(r.state.bench, ['d4', 'f3'], 'RB and RW, with no seat in their band, go to the bench');

  // setFormation — 4-2-3-1 → 4-4-2 keeps LM and RM by id
  const shaped = {
    ...xi.EMPTY_CLUB,
    formation: '4-2-3-1',
    placements: { GK: 'gk1', LDM: 'm1', RDM: 'm2', LM: 'm3', AM: 'm4', RM: 'm5', ST: 'f1' },
  };
  r = run(shaped, { type: 'setFormation', formation: '4-4-2' });
  eq([r.state.placements.LM, r.state.placements.RM], ['m3', 'm5'], 'LM and RM survive by id');
  eq([r.state.placements.LCM, r.state.placements.RCM], ['m1', 'm2'], 'LDM/RDM take the empty midfield seats');
  eq(r.state.bench, ['m4'], 'the AM, with no midfield seat left, goes to the bench');
  eq(r.state.placements.LST, 'f1');

  // setFormation round trip keeps everyone somewhere
  r = run(full433, { type: 'setFormation', formation: '5-4-1' }, { type: 'setFormation', formation: '4-3-3' });
  const everyone = [...Object.values(r.state.placements), ...r.state.bench].sort();
  ok(everyone.length <= 11 + 7, 'nobody is duplicated by a reshape');
  eq(new Set(everyone).size, everyone.length, 'no player in two places after a round trip');

  // validity
  eq(xi.validateXi(full433, squad), { count: 11, ready: true, noGk: false }, 'full 4-3-3 with a keeper is ready');
  eq(xi.validateXi({ placements: { ...full433.placements, GK: 'd5' } }, squad).noGk, true, 'an outfielder in goal is "no goalkeeper"');
  const ten = { ...full433.placements };
  delete ten.RW;
  eq(xi.validateXi({ placements: ten }, squad), { count: 10, ready: false, noGk: false }, 'ten is not ready, and says nothing about the keeper');
  const ghosts = { ...full433.placements, RW: 'departed' };
  eq(xi.validateXi({ placements: ghosts }, squad).count, 10, 'a departed player does not count');
  eq(xi.validateXi({ placements: ghosts }, new Map()).count, 11, 'an unloaded squad counts keys (no 0-of-11 flash)');

  // save / load / delete
  const saveAt = (state, id) => run(state, { type: 'saveLineup', id, name: `L${id}`, savedAt: '2026-09-26T10:00:00Z' });
  r = saveAt(full433, 'a');
  eq([r.effect, r.state.lineups.length, r.state.loadedId], ['saved', 1, 'a']);
  eq(saveAt({ placements: ten, ...xi.EMPTY_CLUB, placements: ten }, 'b').effect, null, 'ten players cannot be saved');
  let five = full433;
  for (const id of ['1', '2', '3', '4', '5']) five = saveAt(five, id).state;
  eq(five.lineups.map((l) => l.id), ['5', '4', '3', '2', '1'], 'newest first');
  eq(saveAt(five, '6').effect, null, 'a sixth lineup is refused');
  r = run(five, { type: 'clear' }, { type: 'loadLineup', id: '3' });
  eq([r.effect, r.state.loadedId, r.state.placements], ['loaded', '3', full433.placements]);
  r = run(five, { type: 'deleteLineup', id: '5' });
  eq([r.effect, r.state.loadedId, r.state.lineups.length], ['deleted', null, 4], 'deleting the loaded lineup clears the ring');

  // load drops a departed player from the working copy, never from the save
  const withGhost = { ...xi.EMPTY_CLUB, lineups: [{ id: 'g', name: 'G', formation: '4-3-3', placements: ghosts, bench: ['departed', 'm4'], savedAt: 'x' }] };
  r = run(withGhost, { type: 'loadLineup', id: 'g' });
  eq(r.state.placements.RW, undefined, 'the departed RW is not on the working pitch');
  eq(r.state.bench, ['m4']);
  eq(r.state.lineups[0].placements.RW, 'departed', 'the saved lineup is not rewritten');

  // prune rides every action, and never on an unloaded squad
  r = run({ ...full433, placements: ghosts }, { type: 'mirror' });
  ok(!Object.values(r.state.placements).includes('departed'), 'a departed player leaves with the next action');
  const cold = xi.reduceXi({ ...full433, placements: ghosts }, { type: 'mirror' }, new Map());
  ok(Object.values(cold.state.placements).includes('departed'), 'an unloaded squad prunes nobody');

  eq(xi.sameClubXi(full433, { ...full433, placements: { ...full433.placements } }), true);
  eq(xi.sameClubXi(full433, run(full433, { type: 'mirror' }).state), false);

  /* ── 5 · Migration ─────────────────────────────────────────────────────── */

  const v1 = JSON.stringify({
    v: 1,
    clubs: {
      barcelona: { formation: '4-2-3-1', look: 'turf', placed: { 0: 'gk', 7: 'lam', 8: 'cam', 9: 'ram', 10: 'st' }, title: 'Mi once' },
      betis: { formation: '4-3-2-1', look: 'angled', placed: { 8: 'lam', 9: 'ram', 99: 'x', 3: 'dup', 4: 'dup' }, title: '   ' },
      bogus: { formation: 'nope', placed: { 0: 'k' } },
    },
  });
  const parsed = mig.parseStoredXi(v1);
  eq(parsed.migrated, true);
  eq(parsed.stored.v, 2);
  eq(
    parsed.stored.clubs.barcelona.placements,
    { GK: 'gk', LM: 'lam', AM: 'cam', RM: 'ram', ST: 'st' },
    '4-2-3-1: LAM/CAM/RAM → LM/AM/RM',
  );
  eq(parsed.stored.clubs.barcelona.title, 'Mi once', 'the card title survives');
  eq(parsed.stored.clubs.betis.placements, { LAM: 'lam', RAM: 'ram', RCB: 'dup' }, '4-3-2-1 keeps LAM/RAM; out-of-range and duplicate drop');
  eq(parsed.stored.clubs.betis.title, null, 'a blank title is the default');
  eq(parsed.stored.clubs.bogus.formation, '4-3-3', 'an unknown formation falls back');
  ok(!('look' in parsed.stored.clubs.barcelona), 'look is dropped');
  eq(parsed.stored.view.onboarded, true, 'someone who built an XI is onboarded');
  eq(parsed.stored.lastClub, null);

  const again = mig.parseStoredXi(JSON.stringify(parsed.stored));
  eq(again.migrated, false);
  eq(again.stored, parsed.stored, 'a v2 round trip is idempotent');

  for (const garbage of [null, '', 'not json', '42', '[]', '{"v":9}', '{"v":2,"clubs":7,"view":"x"}']) {
    const g = mig.parseStoredXi(garbage);
    eq(g.stored.clubs, {}, `garbage ${JSON.stringify(garbage)} → no clubs`);
    eq(g.stored.view, mig.DEFAULT_VIEW);
  }
  const hostile = mig.parseStoredXi(
    JSON.stringify({
      v: 2,
      lastClub: 'betis',
      clubs: {
        betis: {
          formation: '4-4-2',
          placements: { GK: 'a', AM: 'b', LST: 'a' },
          bench: ['c', 'a', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
          lineups: Array.from({ length: 7 }, (_, i) => ({ id: `l${i}`, name: 'n', formation: '4-4-2', placements: {}, bench: [], savedAt: 's' })),
          loadedId: 'gone',
          title: 'x'.repeat(40),
        },
      },
      view: { tiltX: 90, rotZ: 7230, flatRot: 90, statsMode: 'career', flat: 'yes' },
    }),
  ).stored;
  const hb = hostile.clubs.betis;
  eq(hb.placements, { GK: 'a' }, 'a slot the shape lacks and a second seat both drop');
  eq(hb.bench, ['c', 'd', 'e', 'f', 'g', 'h', 'i'], 'the bench drops the seated player and stops at seven');
  eq(hb.lineups.length, 5, 'five lineups at most');
  eq(hb.loadedId, null, 'a loadedId naming no lineup is dropped');
  eq(hb.title.length, 26, 'the title is clamped');
  eq(
    [hostile.view.tiltX, hostile.view.rotZ, hostile.view.flatRot, hostile.view.statsMode, hostile.view.flat],
    [64, 30, 0, 'season', true],
    'the view is clamped, reduced to one turn, and defaulted field by field',
  );

  /* ── 6 · The camera ────────────────────────────────────────────────────── */

  // (1) React Native: build each op's 4×4 (row-major, as `Transform::*` does)
  // and fold them with `operator*`, which computes rhs · lhs.
  const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const rnMul = (lhs, rhs) => {
    const out = new Array(16).fill(0);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < 4; k++) out[i * 4 + j] += rhs[i * 4 + k] * lhs[k * 4 + j];
    return out;
  };
  const rnOp = (op) => {
    const m = I();
    const deg = (v) => (parseFloat(v) * Math.PI) / 180;
    if ('translateX' in op) m[12] = op.translateX;
    else if ('translateY' in op) m[13] = op.translateY;
    else if ('perspective' in op) m[11] = -1 / op.perspective;
    else if ('scaleX' in op) m[0] = op.scaleX;
    else if ('scaleY' in op) m[5] = op.scaleY;
    else if ('rotateX' in op) {
      const a = deg(op.rotateX);
      m[5] = Math.cos(a); m[6] = Math.sin(a); m[9] = -Math.sin(a); m[10] = Math.cos(a);
    } else if ('rotateZ' in op) {
      const a = deg(op.rotateZ);
      m[0] = Math.cos(a); m[1] = Math.sin(a); m[4] = -Math.sin(a); m[5] = Math.cos(a);
    } else throw new Error(`unknown op ${JSON.stringify(op)}`);
    return m;
  };
  const rnProject = (view, ux, uy) => {
    const M = cam.planeOps(view).map(rnOp).reduce(rnMul, I());
    const p = [(ux - 260) * view.unit, (uy - 400) * view.unit, 0, 1];
    const r = [0, 0, 0, 0];
    for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j] += p[k] * M[k * 4 + j];
    return { x: view.w / 2 + r[0] / r[3], y: view.h / 2 + r[1] / r[3] };
  };

  // (2) The handoff's CSS scene, column vectors, written from the stylesheet:
  // parent `perspective: 1400px; perspective-origin: 50% 30%`, the plane's
  // centre at (50%, centre%) of the scene, `translate(pan) scale(s)
  // rotateX(tilt) rotateZ(rot)` about its own centre, 1 CSS px = 1 pt.
  // ⚠ The plane is 520 × 800 CSS px BEFORE `scale(s)`, and CSS `scale()` is
  // `scale3d(s, s, 1)`: depth stays in unscaled plane px.
  const cssProject = (view, ux, uy) => {
    const s = view.scale;
    const rz = (view.rot * Math.PI) / 180;
    const rx = (view.tilt * Math.PI) / 180;
    let x = ux - 260;
    let y = uy - 400;
    let z = 0;
    [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
    [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    x *= s;
    y *= s;
    // into scene coordinates: plane centre, then pan
    x += view.w / 2 + view.panX;
    y += view.centre * view.h + view.panY;
    // perspective about its origin
    const ox = view.w / 2;
    const oy = 0.3 * view.h;
    const w = 1 - z / 1400;
    return { x: ox + (x - ox) / w, y: oy + (y - oy) / w };
  };

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let n = 0; n < 300; n++) {
    const w = 300 + rand() * 120;
    const h = 380 + rand() * 260;
    const zoom = 0.7 + rand() * 1.9;
    const view = {
      w,
      h,
      unit: cam.planeUnit(w),
      scale: cam.planeFit(w, h, rand() < 0.3) * zoom,
      panX: (rand() - 0.5) * 300,
      panY: (rand() - 0.5) * 400,
      centre: rand() < 0.5 ? 0.5 : 0.47,
      tilt: rand() < 0.2 ? 0 : 14 + rand() * 50,
      rot: rand() * 720 - 360,
    };
    const ux = rand() * 520;
    const uy = rand() * 800;
    const ours = cam.projectPoint(view, ux, uy);
    const native = rnProject(view, ux, uy);
    const css = cssProject(view, ux, uy);
    ok(near(ours.x, native.x, 1e-9) && near(ours.y, native.y, 1e-9), `projectPoint = RN operator* fold (case ${n})`);
    ok(near(ours.x, css.x, 1e-9) && near(ours.y, css.y, 1e-9), `projectPoint = the CSS scene (case ${n})`);
  }

  const flatView = { w: 361, h: 520, unit: cam.planeUnit(361), scale: cam.planeFit(361, 520, true), panX: 0, panY: 0, centre: 0.5, tilt: 0, rot: 0 };
  const centre = cam.projectPoint(flatView, 260, 400);
  ok(near(centre.x, 180.5) && near(centre.y, 260), 'flat at rest: the centre spot is the box centre');
  eq(near(centre.depth, 1), true, 'flat has no perspective');
  const tl = cam.projectPoint(flatView, 0, 0);
  const br = cam.projectPoint(flatView, 520, 800);
  ok(near(br.x - tl.x, 520 * flatView.scale) && near(br.y - tl.y, 800 * flatView.scale), 'flat: the plane is exactly scale × 520 × 800');
  const flipped = cam.projectPoint({ ...flatView, rot: 180 }, 260, 728);
  ok(flipped.y < centre.y, 'flipped 180°, the keeper is at the top');

  const tilted = { ...flatView, scale: cam.planeFit(361, 520, false), centre: 0.47, tilt: 34 };
  const farL = cam.projectPoint(tilted, 0, 0);
  const farR = cam.projectPoint(tilted, 520, 0);
  const nearL = cam.projectPoint(tilted, 0, 800);
  const nearR = cam.projectPoint(tilted, 520, 800);
  ok(farR.x - farL.x < nearR.x - nearL.x, 'tilted: the far touchline is shorter than the near one');
  ok(farL.depth < 1 && nearL.depth > 1, 'tilted: the far end recedes, the near end comes forward');
  ok(cam.projectPoint({ ...tilted, tilt: 64 }, 0, 0).depth > 0.5, 'even at 64° the far corner stays in front of the camera');

  eq(cam.clampPan(1, 50, 50), { x: 0, y: 0 }, 'no pan at zoom 1');
  eq(cam.clampPan(2, 500, -500), { x: 200, y: -280 }, 'pan limits: (zoom−1)·200, ×1.4 vertically');

  /* ── 7 · Stats ─────────────────────────────────────────────────────────── */

  const raphinha = JSON.parse(readFileSync(join(repo, 'scripts/fixtures/stats-player-raphinha.json'), 'utf8'));
  const valverde = JSON.parse(readFileSync(join(repo, 'scripts/fixtures/stats-player-valverde.json'), 'utf8'));
  eq(stats.xiStats(raphinha, 'season', 2026), { goals: 8, assists: 1, yellows: null, seasons: null }, 'Raphinha 2026: yellows hidden below the coverage floor');
  eq(stats.xiStats(raphinha, 'season', 2025), { goals: 3, assists: 2, yellows: 0, seasons: null }, '2025 is sufficient: a real zero');
  eq(stats.xiStats(raphinha, 'season', 2024), null, 'no row for the season is nothing, not last season');
  eq(stats.xiStats(raphinha, 'recent', 2026), { goals: 11, assists: 3, yellows: 0, seasons: 2 }, 'recent = overall, with its own season count');
  eq(stats.xiStats(valverde, 'season', 2026).goals, 1);
  eq(stats.xiStats(null, 'season', 2026), null);
  eq(stats.xiStats({ ...raphinha, overall: null }, 'recent', 2026), null);

  /* ── 8 · Clubs ─────────────────────────────────────────────────────────── */

  const standings = JSON.parse(readFileSync(join(repo, 'scripts/fixtures/standings-2026.json'), 'utf8'));
  // The catalogue: every club in every table, segunda's included — as
  // `useTeams()` really carries LaLiga's five tracked segunda clubs.
  const catalogue = standings.tables.flatMap((t) =>
    t.rows.map((row) => ({ slug: row.team.slug, name: row.team.name, shortName: row.team.shortName ?? null })),
  );
  const laliga = findLeague('la-liga');
  const directory = clubs.xiClubDirectory(standings.tables, catalogue);
  eq(
    directory.map((g) => g.league.slug),
    [...LEAGUES].sort((a, b) => a.order - b.order).filter((l) => l.squads).map((l) => l.slug),
    'only squad-publishing leagues are offered, in editorial order',
  );
  eq(directory.find((g) => g.league === laliga).clubs.length, 20, 'LaLiga offers its twenty');
  const segunda = new Set(standings.tables.find((t) => t.league.slug === 'segunda').rows.map((r) => r.team.slug));
  ok(!directory.some((g) => g.clubs.some((c) => segunda.has(c.slug))), 'no segunda club is offered');
  eq(clubs.xiClubDirectory(undefined, catalogue), [], 'no tables, no directory — membership is never guessed');
  eq(clubs.offeredSlugs(directory, false), undefined, 'not ready is undefined, not empty');
  const atleti = { slug: 'atletico-madrid', name: 'Atlético de Madrid', shortName: 'ATM' };
  eq(
    [clubs.matchClub(atleti, 'atletico'), clubs.matchClub(atleti, 'ATM'), clubs.matchClub(atleti, 'madrid'), clubs.matchClub(atleti, 'bar')],
    [true, true, true, false],
    'club search folds accents and matches the code',
  );
  eq(clubs.xiLeagueOf(directory, 'barcelona')?.slug, 'la-liga');

  const offered = clubs.offeredSlugs(directory, true);
  const pick = (inputs) => clubs.resolveXiClub({ param: null, lastClub: null, favourite: null, followed: [], offered, ...inputs });
  eq(pick({ param: 'betis', lastClub: 'barcelona' }), { kind: 'club', slug: 'betis' }, 'a deep link wins');
  eq(pick({ lastClub: 'barcelona', favourite: 'arsenal' }), { kind: 'club', slug: 'barcelona' }, 'then the last club');
  eq(pick({ favourite: 'arsenal', followed: ['barcelona'] }), { kind: 'club', slug: 'arsenal' }, 'then the favourite');
  eq(pick({ favourite: 'inter', followed: ['bayern', 'barcelona'] }), { kind: 'club', slug: 'barcelona' }, 'unoffered clubs are skipped');
  eq(pick({}), { kind: 'none' }, 'no clubs at all is the empty state');
  eq(pick({ followed: ['bayern'] }), { kind: 'none' }, 'only unoffered follows is the empty state too');
  eq(pick({ followed: ['barcelona'], offered: undefined }), { kind: 'pending' }, 'waits for the directory rather than guessing');

  /* ── 9 · The limiter ───────────────────────────────────────────────────── */

  const limit = createLimiter(4);
  let active = 0;
  let peak = 0;
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      limit(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        if (i === 3) throw new Error('boom');
        return i;
      }).catch(() => 'failed'),
    ),
  );
  eq(peak, 4, 'never more than four in flight');
  eq(results[3], 'failed');
  eq(results[9], 9, 'a failure frees its slot');

  console.log(`✓ starting-xi harness: ${checks} assertions`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
