/**
 * Plain-node harness for `lib/cronogol/league-theme.ts` — the per-league crown
 * and page tint (ADR 0164).
 *
 * Run: `node scripts/league-theme-harness.mjs`.
 *
 * It exists because the three things most likely to go wrong here are all
 * provable without a build, and none of them would show up in a screenshot of
 * the league you happened to be looking at:
 *
 *   1. **The ink has to survive the rotation.** The whole design rests on
 *      holding each stop's lightness so `onCrown` stays legible on the bright
 *      band. The contrast check below runs over `LeagueBand` ITSELF, so a
 *      league added later cannot skip it — that is the point of iterating the
 *      table rather than listing today's five.
 *   2. **The brand must come back as the LITERAL table.** A brand round-trip
 *      through the hue swap would turn the mesh's teal pools olive on every
 *      screen with no league — Today, News, the club pages, onboarding. The
 *      assertion is reference identity, which is the only version of this that
 *      cannot rot.
 *   3. **`apiSlug` is not `slug`.** Keying on `la-liga` leaves LaLiga alone on
 *      the brand crown while the other four look perfect (trap 34 / ADR 0084).
 *      The harness asserts the WRONG key gives the wrong answer, so the trap
 *      stays demonstrated rather than merely described.
 *
 * ⚠ The contrast maths lives here, not in the app: nothing in `src/` needs a
 * luminance function at runtime, and adding one to ship a number no screen reads
 * would be a token nobody maintains.
 *
 * The transpile-and-require mechanics are `team-window-harness.mjs`'s, verbatim
 * in shape; see that file's header for why CommonJS and why the alias hook.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'agfc-league-theme-harness-'));

/**
 * ⚠⚠ **Every tolerance below is 8-BIT QUANTISATION, measured, not slack allowed
 * for sloppiness.** The ladder's darkest stops are L 6–9, where a channel is a
 * value like `(26, 2, 28)` — one 8-bit step is 0.392 in L% terms, and at that
 * amplitude hue and saturation simply cannot be represented precisely. Measured
 * worst case over every stop of every banded league: **L 0.18, S 1.75, H 1.75**,
 * all of them on the near-black tail.
 *
 * A genuinely wrong ladder is out by whole percent and a wrong hue by tens of
 * degrees, so these still fail loudly on a real bug.
 *
 * ⚠ The MESH keeps hue-only rotation from an 8-bit source, where S and L
 * round-trip exactly (worst error 0.000) — `exact` is for those.
 */
const exact = (a, b, label) => assert.equal(a, b, `${label} (${a} vs ${b})`);
const near = (a, b, tol, label) =>
  assert.ok(Math.abs(a - b) <= tol, `${label} (${a} vs ${b}, tolerance ${tol})`);
const nearL = (a, b, label) => near(a, b, 0.5, label);
const nearSat = (a, b, label) => near(a, b, 2, label);
const nearHue = (a, b, label) => {
  const d = Math.abs(a - b);
  assert.ok(Math.min(d, 360 - d) <= 2, `${label} (${a} vs ${b})`);
};

/** Rec.709 relative luminance, sRGB-linearised — the WCAG definition. */
const luminance = (hex) => {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** `fg` at `alpha` composited over `bg` — how a translucent ink actually lands. */
const over = (fg, bg, alpha) => {
  const ch = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return (
    '#' +
    [0, 1, 2]
      .map((i) => Math.round(ch(fg, i) * alpha + ch(bg, i) * (1 - alpha)).toString(16).padStart(2, '0'))
      .join('')
  );
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
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
        join(repo, 'src/constants/theme.ts'),
        join(repo, 'src/lib/cronogol/club-wash.ts'),
        join(repo, 'src/lib/cronogol/league-theme.ts'),
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

  const { Colors, CrownArt, CrownDeep, CrownDeepSat, CrownGrad, LeagueBand, Mesh } =
    require(join(out, 'constants/theme.js'));
  const { parseHex } = require(join(out, 'lib/cronogol/club-wash.js'));
  const { leagueCrownTheme, leagueHue } = require(join(out, 'lib/cronogol/league-theme.js'));

  // The API is one call returning ramp + mesh + ink + art together; these keep
  // the assertions below readable.
  const leagueCrown = (slug) => leagueCrownTheme(slug).stops;
  const leagueMesh = (slug) => leagueCrownTheme(slug).pools;

  const entried = Object.keys(LeagueBand);
  assert.ok(entried.length >= 5, 'LeagueBand should hold at least the five leagues 0062 gave bands');

  /* ── 1 · The brand path returns the LITERAL tables, by reference ─────────── */

  assert.equal(leagueCrown(null), CrownGrad, 'no league must return the CrownGrad table itself');
  assert.equal(leagueMesh(null), Mesh, 'no league must return the Mesh table itself');
  assert.equal(leagueCrownTheme(null).tone, 'bright', 'the brand ramp takes DARK ink');
  assert.equal(leagueCrownTheme(null).art, null, 'the brand crown carries no crest');
  assert.equal(leagueHue(null), null);
  assert.equal(leagueHue(undefined), null);
  assert.equal(leagueHue(''), null, 'an empty slug is "no league", not a lookup');

  // The three competitions in the catalogue with no band row (ADR 0105/0150/0159).
  for (const slug of ['lpr-pro-clausura', 'liga-nacional-apertura', 'champions-league']) {
    assert.equal(leagueHue(slug), null, `${slug} has no band and must wear the brand`);
    assert.equal(leagueCrown(slug), CrownGrad, `${slug} must get the literal crown`);
    assert.equal(leagueMesh(slug), Mesh, `${slug} must get the literal mesh`);
    // ⚠⚠ THE coupling this file exists to pin: an unbanded competition wears the
    // BRAND ramp, so its ink must stay DARK. Derive ink from "do I have a
    // league?" instead of from the ramp and these three go white on lime.
    assert.equal(
      leagueCrownTheme(slug).tone,
      'bright',
      `${slug} wears the brand ramp and must therefore keep DARK ink`,
    );
  }

  /* ── 2 · apiSlug is not slug (trap 34 / ADR 0084) ────────────────────────── */

  assert.equal(typeof leagueHue('laliga'), 'number', 'the API slug resolves');
  assert.equal(
    leagueHue('la-liga'),
    null,
    'our ROUTE slug must NOT resolve — this is the bug that hides on four leagues',
  );
  // And it is a real difference in output, not just in the lookup.
  assert.notEqual(leagueCrown('laliga')[0].color, CrownGrad[0].color);
  assert.equal(leagueCrown('la-liga')[0].color, CrownGrad[0].color);

  /* ── 3 · Hue-only mutation, over every entry in the table ────────────────── */

  const last = CrownDeep.length - 1;
  const ground = CrownGrad[CrownGrad.length - 1].color;

  for (const slug of entried) {
    const hue = leagueHue(slug);
    assert.equal(typeof hue, 'number', `${slug} is in LeagueBand so it must resolve a hue`);

    /* The CROWN follows `CrownDeep`: the ladder's lightness and opacity, the
       band's hue, and a saturation pulled into `CrownDeepSat`. */
    const crown = leagueCrown(slug);
    assert.equal(crown.length, CrownDeep.length, `${slug} crown keeps every stop`);

    const bandSat = parseHex(
      'solid' in LeagueBand[slug] ? LeagueBand[slug].solid : LeagueBand[slug].gradient[0],
    ).s;
    const wantSat = Math.min(Math.max(bandSat, CrownDeepSat.min), CrownDeepSat.max);
    assert.ok(
      wantSat >= CrownDeepSat.min && wantSat <= CrownDeepSat.max,
      `${slug}'s saturation must land inside the window`,
    );

    crown.forEach((stop, i) => {
      const source = CrownDeep[i];
      assert.equal(stop.offset, source.offset, `${slug} stop ${i} keeps the ladder's offset`);
      assert.equal(stop.opacity, source.opacity, `${slug} stop ${i} keeps the ladder's opacity`);

      if (i === last) {
        // ⚠ The ground seam is held verbatim — re-hueing it tints the hand-off
        // to the mesh and leaves a visible edge.
        assert.equal(stop.color, ground, `${slug} last stop is the untouched ground`);
        return;
      }

      const to = parseHex(stop.color);
      nearL(to.l, source.light, `${slug} stop ${i} takes the ladder's lightness`);
      nearSat(to.s, wantSat, `${slug} stop ${i} takes the clamped saturation`);
      nearHue(to.h, hue, `${slug} stop ${i} takes the league hue`);
    });

    /* The MESH keeps ADR 0164's hue-only rule — S and L survive untouched. */
    const mesh = leagueMesh(slug);
    assert.equal(mesh.length, Mesh.length, `${slug} mesh keeps all three pools`);
    mesh.forEach((pool, i) => {
      const source = Mesh[i];
      for (const key of ['cx', 'cy', 'rx', 'ry', 'alpha', 'fade']) {
        assert.equal(pool[key], source[key], `${slug} pool ${i} keeps ${key}`);
      }
      const from = parseHex(source.color);
      const to = parseHex(pool.color);
      exact(to.s, from.s, `${slug} pool ${i} holds saturation`);
      exact(to.l, from.l, `${slug} pool ${i} holds lightness`);
      nearHue(to.h, hue, `${slug} pool ${i} takes the league hue`);
    });

    /* And the ink family travels with the ramp. */
    assert.equal(leagueCrownTheme(slug).tone, 'deep', `${slug} has a band, so its ink is WHITE`);
  }

  /* ── 4 · The ink reads on every league's DEEP band ───────────────────────── */

  const AA = 4.5;
  const brand = contrast(Colors.dark.onCrown, CrownGrad[0].color);
  assert.ok(brand > 13, `the brand's own crown should be far clear of AA (got ${brand.toFixed(2)})`);

  /**
   * ⚠⚠ **Both inks, and the top TWO stops.** The title sits at stop 0 and the
   * eyebrow and meta line sit around stop 1, so a ladder that passed on the very
   * top alone could still put the quiet ink somewhere it cannot be read. The dim
   * ink is the one that goes first — it is the tighter of the two everywhere.
   *
   * ⚠ Iterating `LeagueBand` ITSELF is the point: a league added later cannot
   * skip this check by not being listed here.
   */
  for (const slug of entried) {
    const stops = leagueCrown(slug);
    for (const i of [0, 1]) {
      const bg = stops[i].color;
      for (const [name, ink] of [
        ['onDeep', Colors.dark.onDeep],
        ['onDeepDim', over(Colors.dark.onDeep, bg, 0.62)],
      ]) {
        const ratio = contrast(ink, bg);
        assert.ok(
          ratio >= AA,
          `${name} on ${slug}'s stop ${i} (${bg}) is ${ratio.toFixed(2)}:1, under AA ${AA} — ` +
            `this league cannot take the deep crown's white ink and needs its own ` +
            `decision, not a nudge to the ladder`,
        );
      }
    }
    const top = stops[0].color;
    console.log(
      `  ${slug.padEnd(16)} ${top}  white ${contrast(Colors.dark.onDeep, top).toFixed(2)}` +
        `  dim ${contrast(over(Colors.dark.onDeep, top, 0.62), top).toFixed(2)}`,
    );
  }

  /**
   * ⚠⚠ **The same two inks again, with the CREST composited under them.** The
   * art is white, so it lightens the very band the head sits on — on the
   * Premier League it costs `onDeepDim` 5.33 → 4.72. That still clears AA, and
   * this assertion is what stops the next nudge to `CrownArt.alpha` from
   * quietly taking it under.
   *
   * ⚠ Rated at the crest's PEAK alpha over the ramp's LIGHTEST stop, which is
   * the worst case and is a shade worse than anywhere the text actually sits.
   * A guard is not the place to model the gradient's falloff.
   */
  for (const slug of entried) {
    const bg = over(Colors.dark.onDeep, leagueCrown(slug)[0].color, CrownArt.alpha);
    for (const [name, ink] of [
      ['onDeep', Colors.dark.onDeep],
      ['onDeepDim', over(Colors.dark.onDeep, bg, 0.62)],
    ]) {
      const ratio = contrast(ink, bg);
      assert.ok(
        ratio >= AA,
        `${name} over ${slug}'s crest-lit top stop (${bg}) is ${ratio.toFixed(2)}:1, ` +
          `under AA ${AA} — CrownArt.alpha ${CrownArt.alpha} is too high for this ` +
          `league's ramp, so lower the art rather than the ink`,
      );
    }
  }

  /**
   * ⚠ And the ink that is NOT used must be the one that fails — otherwise the
   * two families are interchangeable and `tone` is decoration. Dark ink on a
   * deep crown is the mistake this pins.
   */
  for (const slug of entried) {
    const ratio = contrast(Colors.dark.onCrown, leagueCrown(slug)[0].color);
    assert.ok(
      ratio < AA,
      `${slug}'s deep crown should DEFEAT onCrown's dark ink (got ${ratio.toFixed(2)}) — ` +
        `if it passes, the ramp is not deep and the tone split has no meaning`,
    );
  }

  /* ── 5 · The rotation is reversible in the only sense that matters ───────── */

  // Two leagues that share a hue must produce the same ramp; LaLiga and the
  // Bundesliga are 5° apart, so they must NOT.
  assert.deepEqual(leagueCrown('laliga'), leagueCrown('segunda'), 'segunda shares LaLiga red (0062)');
  assert.notDeepEqual(leagueCrown('laliga'), leagueCrown('bundesliga'));

  /* ── 6 · The bled crest is the Premier League's alone ────────────────────── */

  assert.equal(leagueCrownTheme('premier-league').art, 'premier-league');
  for (const slug of [...entried.filter((l) => l !== 'premier-league'), 'champions-league', null]) {
    assert.equal(
      leagueCrownTheme(slug).art,
      null,
      `${slug} has no bundled silhouette, and drawing none is the correct state ` +
        `rather than a gap — do not substitute the wire's lockup`,
    );
  }

  console.log(`\nleague-theme: all assertions passed over ${entried.length} banded leagues.`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
