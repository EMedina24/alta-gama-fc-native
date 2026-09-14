/**
 * Plain-node harness for `lib/board-layout.ts` (ADR 0174).
 *
 * Run: `node scripts/board-layout-harness.mjs`.
 *
 * The rule worth pinning is `normalizeLayout`'s second half. Dropping unknown
 * ids is obvious and would be caught by eye; INSERTING a card the stored layout
 * has never heard of is not, and getting it wrong is silent and permanent — a
 * card added in a later release would simply never appear for anyone who had
 * already arranged their board, on a screen that looks entirely correct.
 *
 * ⚠ The module imports nothing at all, so there is no stub here and nothing to
 * mock: that is exactly why the catalogue rules live in their own file rather
 * than inside the screen or the store.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'agfc-board-layout-harness-'));

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
        strict: true,
      },
      files: [join(repo, 'src/lib/board-layout.ts')],
    }),
  );
  execFileSync('npx', ['tsc', '--project', tsconfig], { cwd: repo, stdio: 'inherit' });

  const require = createRequire(import.meta.url);
  const {
    applyVisibleOrder,
    BOARD_CARDS,
    BUILT_COUNT,
    DEFAULT_HIDDEN,
    DEFAULT_ORDER,
    moveCard,
    normalizeLayout,
    setHidden,
    trayCards,
    visibleCards,
  } = require(join(out, 'lib/board-layout.js'));

  assert.ok(BOARD_CARDS.length >= 5, 'the module loaded, not just resolved');

  /* ── 1 · The default layout is a fixed point ─────────────────────────────── */

  const def = normalizeLayout(DEFAULT_ORDER, DEFAULT_HIDDEN);
  assert.deepEqual(def.order, [...DEFAULT_ORDER], 'the default order survives a normalize');
  assert.deepEqual(def.hidden, [...DEFAULT_HIDDEN], 'and so does the default hidden set');
  assert.deepEqual(
    normalizeLayout(def.order, def.hidden),
    def,
    'normalize is idempotent — a stored value cannot drift by being read twice',
  );

  /* ── 2 · Nothing stored yet ──────────────────────────────────────────────── */

  for (const empty of [undefined, null, [], 'nonsense', {}, 42]) {
    assert.deepEqual(
      normalizeLayout(empty, empty),
      def,
      `a ${JSON.stringify(empty) ?? 'undefined'} payload must read as the default layout`,
    );
  }

  /* ── 3 · Unknown ids are dropped ─────────────────────────────────────────── */

  const withJunk = normalizeLayout(
    ['news', 'a-card-we-deleted', 'last', 'news'],
    ['a-card-we-deleted', 'table'],
  );
  assert.equal(
    withJunk.order.filter((id) => id === 'news').length,
    1,
    'a duplicated id appears once',
  );
  assert.ok(!withJunk.order.includes('a-card-we-deleted'), 'an id off the catalogue is dropped');
  assert.ok(!withJunk.hidden.includes('a-card-we-deleted'), 'and dropped from the hidden set too');
  assert.deepEqual(
    [...withJunk.order].sort(),
    [...DEFAULT_ORDER].sort(),
    'the result is always the WHOLE catalogue, once each',
  );

  /* ── 4 · THE rule: a card the stored layout never heard of ───────────────── */

  // A reader who arranged their board before `results` existed, and who moved
  // `counters` to the very top.
  const older = ['counters', 'last', 'news', 'upcoming'];
  const grown = normalizeLayout(older, []);

  assert.deepEqual(
    grown.order.filter((id) => older.includes(id)),
    older,
    "the reader's own relative order is untouched",
  );
  assert.equal(
    grown.order.indexOf('results'),
    grown.order.indexOf('news') + 1,
    'a new card lands directly after its nearest surviving DEFAULT predecessor — ' +
      'never appended, and never at a raw default index the reader already invalidated',
  );
  assert.ok(
    grown.hidden.includes('table') && grown.hidden.includes('season'),
    'a newly inserted card takes its OWN default visibility — absence from the ' +
      'stored hidden list means the reader never had an opinion, not that they turned it on',
  );
  assert.ok(
    !grown.hidden.includes('results'),
    'and a default-on card arrives on, not off',
  );

  // A card whose every default predecessor is missing goes to the front.
  const headless = normalizeLayout(['counters'], []);
  assert.equal(headless.order[0], DEFAULT_ORDER[0], 'no surviving predecessor means index 0');

  /* ── 5 · The hidden set can never outrun the order ───────────────────────── */

  const stray = normalizeLayout(['last', 'news'], ['season', 'last']);
  assert.ok(stray.hidden.includes('last'), 'a stored hidden id that IS in the order survives');
  assert.deepEqual(
    stray.hidden,
    stray.order.filter((id) => stray.hidden.includes(id)),
    'the hidden set is emitted in `order` order — two equal layouts must serialise ' +
      'identically, or the store comparator (ADR 0166) reports a change that never happened',
  );
  for (const id of stray.hidden) {
    assert.ok(stray.order.includes(id), 'every hidden id is in the order');
  }

  /* ── 6 · moveCard is a permutation, always ───────────────────────────────── */

  const sorted = (xs) => [...xs].sort();
  for (let from = 0; from < DEFAULT_ORDER.length; from += 1) {
    for (let to = 0; to < DEFAULT_ORDER.length; to += 1) {
      const moved = moveCard(DEFAULT_ORDER, from, to);
      assert.deepEqual(sorted(moved), sorted(DEFAULT_ORDER), `move ${from}→${to} loses nothing`);
      assert.equal(moved[to], DEFAULT_ORDER[from], `move ${from}→${to} lands where asked`);
    }
  }
  for (const [from, to] of [
    [-1, 0],
    [0, -1],
    [0, DEFAULT_ORDER.length],
    [DEFAULT_ORDER.length, 0],
  ]) {
    assert.deepEqual(moveCard(DEFAULT_ORDER, from, to), DEFAULT_ORDER, 'out of range is a no-op');
  }

  /* ── 7 · What the screen and the tray actually draw ──────────────────────── */

  const unbuilt = BOARD_CARDS.filter((card) => !card.built).map((card) => card.id);
  assert.ok(
    unbuilt.every((id) => !visibleCards(def).includes(id) && !trayCards(def).includes(id)),
    'a DECLARED but unbuilt card appears in neither the stack nor the tray',
  );
  assert.ok(
    unbuilt.every((id) => def.order.includes(id)),
    '...and is still held in the stored order, so building it resets nobody',
  );
  assert.equal(
    visibleCards(def).length + trayCards(def).length,
    BUILT_COUNT,
    'the hint bar total is exactly what the reader can see plus what they can add back',
  );

  /* ── 8 · Put a card away and bring it back ───────────────────────────────── */

  const away = { order: def.order, hidden: setHidden(def, 'news', true) };
  assert.ok(away.hidden.includes('news'), 'removing hides it');
  assert.ok(trayCards(away).includes('news'), 'and offers it in the tray');
  assert.ok(!visibleCards(away).includes('news'), 'and takes it off the stack');

  const back = { order: away.order, hidden: setHidden(away, 'news', false) };
  assert.deepEqual(
    visibleCards(back),
    visibleCards(def),
    'bringing it back returns it to its REMEMBERED slot, not to the bottom — the ' +
      'whole reason the order holds hidden cards too',
  );

  /* ── 9 · A drag over the VISIBLE rows, folded back into the full order ──── */

  // `news` is put away; the reader drags `counters` to the top of what is left.
  const withHidden = { order: def.order, hidden: setHidden(def, 'news', true) };
  const shown = visibleCards(withHidden);
  const dragged = moveCard(shown, shown.indexOf('counters'), 0);
  const folded = applyVisibleOrder(withHidden.order, dragged);

  assert.deepEqual(
    folded.filter((id) => shown.includes(id)),
    [...dragged],
    'the visible cards end up in the dragged sequence',
  );
  assert.equal(
    folded.indexOf('news'),
    withHidden.order.indexOf('news'),
    'a HIDDEN card keeps its absolute slot through a drag it took no part in — ' +
      'this is what makes adding it back return it where it was',
  );
  assert.deepEqual(
    [...folded].sort(),
    [...withHidden.order].sort(),
    'folding a drag back into the order loses nothing and invents nothing',
  );
  assert.deepEqual(
    applyVisibleOrder(def.order, ['a-card-we-deleted']),
    def.order,
    'a sequence naming a card the order does not hold is ignored whole — a drag ' +
      'must never be able to invent a card',
  );

  console.log(
    `\nboard-layout: all assertions passed (${BOARD_CARDS.length} catalogue cards, ` +
      `${BUILT_COUNT} built).`,
  );
} finally {
  rmSync(out, { recursive: true, force: true });
}
