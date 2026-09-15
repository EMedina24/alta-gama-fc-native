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

  const { Colors, CrownArt, CrownClubArt, CrownClubDim, CrownDeep, CrownDeepSat, CrownGrad, LeagueBand, Mesh } =
    require(join(out, 'constants/theme.js'));
  const { parseHex, TINT_FALLBACK_ENTRIES } = require(join(out, 'lib/cronogol/club-wash.js'));
  const { clubCrownTheme, leagueCrownTheme, leagueHue } = require(
    join(out, 'lib/cronogol/league-theme.js'),
  );

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

  // ⚠ EVERY catalogue competition is banded now (ADR 0173 banded the last,
  // LPR), so the slug here is SYNTHETIC — exactly what 0170's warning demanded
  // when this loop's last real occupant left. It is not a formality: an
  // unknown slug falling back to the brand crown with dark ink is the
  // behaviour every FUTURE league depends on in the gap before its band row
  // lands, and this loop is that contract's only proof.
  for (const slug of ['zz-no-band']) {
    assert.equal(leagueHue(slug), null, `${slug} has no band and must wear the brand`);
    assert.equal(leagueCrown(slug), CrownGrad, `${slug} must get the literal crown`);
    assert.equal(leagueMesh(slug), Mesh, `${slug} must get the literal mesh`);
    // ⚠⚠ THE coupling this file exists to pin: an unbanded slug wears the
    // BRAND ramp, so its ink must stay DARK. Derive ink from "do I have a
    // league?" instead of from the ramp and this case goes white on lime.
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

  /* ── 3 · Hue/sat mutation, over every entry in the table ─────────────────── */

  const last = CrownDeep.length - 1;
  const ground = CrownGrad[CrownGrad.length - 1].color;

  /**
   * The expected ink per position, MIRRORED independently of the module (ADR
   * 0172): a solid band is one clamped {h,s} everywhere; a gradient band lerps
   * hue along the SHORTEST arc and saturation linearly, endpoints clamped —
   * the window is convex, so lerped saturation needs no re-clamp.
   */
  const clampSat = (s) => Math.min(Math.max(s, CrownDeepSat.min), CrownDeepSat.max);
  const lerpHue = (a, b, t) => {
    const delta = ((b - a + 540) % 360) - 180;
    return (((a + delta * t) % 360) + 360) % 360;
  };
  const bandInks = (slug) => {
    const band = LeagueBand[slug];
    const ends = 'solid' in band ? [band.solid, band.solid] : band.gradient;
    return ends.map((hex) => {
      const p = parseHex(hex);
      return { h: p.h, s: clampSat(p.s) };
    });
  };
  const lastOpaqueOffset = CrownDeep[CrownDeep.length - 2].offset;

  for (const slug of entried) {
    const hue = leagueHue(slug);
    assert.equal(typeof hue, 'number', `${slug} is in LeagueBand so it must resolve a hue`);

    const [inkA, inkB] = bandInks(slug);
    const inkAt = (t) => ({ h: lerpHue(inkA.h, inkB.h, t), s: inkA.s + (inkB.s - inkA.s) * t });
    // `leagueHue` stays the FIRST stop's hue — the gradient never moves it.
    assert.ok(Math.abs(hue - inkA.h) < 1.5, `${slug}'s leagueHue is the band's first stop`);

    /* The CROWN follows `CrownDeep`: the ladder's lightness and opacity, the
       band's hue and saturation — lerped down the ladder for a gradient band
       (ADR 0172), constant for a solid one. */
    const crown = leagueCrown(slug);
    assert.equal(crown.length, CrownDeep.length, `${slug} crown keeps every stop`);

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

      const want = inkAt(source.offset / lastOpaqueOffset);
      const to = parseHex(stop.color);
      nearL(to.l, source.light, `${slug} stop ${i} takes the ladder's lightness`);
      nearSat(to.s, want.s, `${slug} stop ${i} takes the clamped (lerped) saturation`);
      nearHue(to.h, want.h, `${slug} stop ${i} takes the league hue at its ladder position`);
    });

    /* The MESH keeps ADR 0164's hue-only rule — S and L survive untouched; a
       gradient band spreads its arc across the pools (pool i at t = i/(n-1)). */
    const mesh = leagueMesh(slug);
    assert.equal(mesh.length, Mesh.length, `${slug} mesh keeps all three pools`);
    mesh.forEach((pool, i) => {
      const source = Mesh[i];
      for (const key of ['cx', 'cy', 'rx', 'ry', 'alpha', 'fade']) {
        assert.equal(pool[key], source[key], `${slug} pool ${i} keeps ${key}`);
      }
      const from = parseHex(source.color);
      const to = parseHex(pool.color);
      const want = inkAt(Mesh.length > 1 ? i / (Mesh.length - 1) : 0);
      exact(to.s, from.s, `${slug} pool ${i} holds saturation`);
      exact(to.l, from.l, `${slug} pool ${i} holds lightness`);
      nearHue(to.h, want.h, `${slug} pool ${i} takes the league hue at its position`);
    });

    /* And the ink family travels with the ramp. */
    assert.equal(leagueCrownTheme(slug).tone, 'deep', `${slug} has a band, so its ink is WHITE`);
  }

  /* ⚠ And the gradient must have ACTUALLY happened — a lerp that quietly
     collapsed to its first stop would pass every per-stop check above on a
     wrong implementation whose t is always 0. Serie A's two hues are ~7°
     apart; LPR's cross half the wheel. */
  for (const slug of ['serie-a', 'lpr-pro-clausura']) {
    const stops = leagueCrown(slug);
    const top = parseHex(stops[0].color).h;
    const foot = parseHex(stops[stops.length - 2].color).h;
    assert.ok(
      Math.abs(((foot - top + 540) % 360) - 180) > 3,
      `${slug}'s ramp must shift hue down the ladder (top ${top.toFixed(1)}°, foot ${foot.toFixed(1)}°)`,
    );
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
  // ⚠ Serie A and Honduras share a HUE (≈217°) and differ only in saturation
  // (62 vs 85 after the CrownDeepSat clamp) — this is the pin that says the
  // clamp keeps two same-hue leagues distinguishable (ADR 0170).
  assert.notDeepEqual(leagueCrown('serie-a'), leagueCrown('liga-nacional-apertura'));

  /* ── 6 · The bled mark belongs to exactly the slugs with bundled art ─────── */

  const ART_SLUGS = [
    'premier-league',
    'laliga',
    'bundesliga',
    'champions-league',
    'serie-a',
    'liga-nacional-apertura',
    'lpr-pro-clausura',
  ];
  for (const slug of ART_SLUGS) {
    assert.equal(leagueCrownTheme(slug).art, slug, `${slug} carries its own mark`);
  }
  // ⚠ segunda shares LaLiga's RAMP (asserted above) but must NOT inherit its
  // art through that: the ART map is keyed by slug, not by colour.
  for (const slug of [...entried.filter((l) => !ART_SLUGS.includes(l)), null]) {
    assert.equal(
      leagueCrownTheme(slug).art,
      null,
      `${slug} has no bundled silhouette, and drawing none is the correct state ` +
        `rather than a gap — do not substitute the wire's lockup`,
    );
  }


  /* ── 7 · The CLUB crown (ADR 0175) — an arbitrary hex on the same ladder ── */

  /**
   * ⚠⚠ **The club crest's alpha carries its own two-tier proof** (0177's
   * shape, restored by ADR 0180 when the watermark moved head-LEFT):
   *
   *  - **WHITE ink over the crest-lit band, at `CrownClubArt.alpha`** — the
   *    conservative model for the one ink that could ever meet the crest.
   *  - **QUIET ink (`onDeepDim`) over the BARE band only.** ⚠ The LAYOUT
   *    premise moved with the crest: under a club background the head is
   *    EMPTY (no eyebrow, no title, no metaLine — a spacer), so no quiet
   *    ink sits in the crest's top-left region. Put quiet ink back into a
   *    club-background head and this rating changes FIRST — it has no
   *    headroom for any composite (4.53:1 bare at the ladder's worst hue).
   *
   * The league marks are untouched: section 4 still rates BOTH inks against
   * the composite at `CrownArt.alpha`.
   */
  assert.ok(
    CrownClubArt.alpha >= CrownArt.alpha,
    'a club crest fainter than the league marks would re-open the too-faint report (ADR 0177)',
  );

  /** hsl → hex, mirrored locally — the sweep needs sources the app never made. */
  const hslHex = (h, sat, l) => {
    const S = sat / 100;
    const L = l / 100;
    const c = (1 - Math.abs(2 * L - 1)) * S;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = L - c / 2;
    const [r, g, b] =
      h < 60 ? [c, x, 0]
      : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
      : h < 240 ? [0, x, c]
      : h < 300 ? [x, 0, c]
      : [c, 0, x];
    return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`;
  };

  /** The two-tier club proof — see the alpha block above for why the tiers. */
  const proveClubInk = (label, theme) => {
    assert.equal(theme.tone, 'deep', `${label} wears the deep crown's white ink`);
    assert.equal(theme.art, null, `${label} carries no bundled mark — the crest is a node`);
    assert.equal(
      theme.stops[theme.stops.length - 1].color,
      ground,
      `${label} holds the ground seam verbatim`,
    );
    for (const i of [0, 1]) {
      const bare = theme.stops[i].color;
      const lit = over(Colors.dark.onDeep, bare, CrownClubArt.alpha);
      // WHITE ink: bare and crest-lit — the one ink that can meet the crest.
      for (const bg of [bare, lit]) {
        const ratio = contrast(Colors.dark.onDeep, bg);
        assert.ok(
          ratio >= AA,
          `onDeep on ${label}'s stop ${i} (${bg}) is ${ratio.toFixed(2)}:1, under AA ${AA} — ` +
            `CrownClubArt.alpha ${CrownClubArt.alpha} is past the white ink's ceiling`,
        );
      }
      // QUIET ink: the BARE band only — the layout premise above.
      const dim = over(Colors.dark.onDeep, bare, 0.62);
      const ratio = contrast(dim, bare);
      assert.ok(
        ratio >= AA,
        `onDeepDim on ${label}'s stop ${i} (${bare}) is ${ratio.toFixed(2)}:1, under AA ${AA}`,
      );
    }
  };

  /** `clubDim`, mirrored independently: piecewise-linear over `CrownClubDim`. */
  const clubDim = (hue) => {
    const h = ((hue % 360) + 360) % 360;
    if (h <= CrownClubDim[0][0] || h >= CrownClubDim[CrownClubDim.length - 1][0]) return 1;
    for (let i = 1; i < CrownClubDim.length; i += 1) {
      const [h1, s1] = CrownClubDim[i];
      if (h <= h1) {
        const [h0, s0] = CrownClubDim[i - 1];
        return s0 + ((s1 - s0) * (h - h0)) / (h1 - h0);
      }
    }
    return 1;
  };

  /**
   * ⚠ The sweep is the PROOF for every possible club hex: a hex's own L never
   * reaches the ramp (the ladder's lightness × `clubDim`'s hue scale is what
   * paints), and saturation is clamped into `CrownDeepSat`'s window — so a
   * dense hue sweep × the window's ends and middle covers the input space.
   * 5°, not 10°: the high-luma valley's edges move a whole AA step in 10°.
   */
  for (let h = 0; h < 360; h += 5) {
    const dim = clubDim(h);
    for (const sat of [CrownDeepSat.min, (CrownDeepSat.min + CrownDeepSat.max) / 2, CrownDeepSat.max]) {
      const theme = clubCrownTheme(hslHex(h, sat, 50));
      proveClubInk(`club hue ${h}° sat ${sat}`, theme);
      const top = parseHex(theme.stops[0].color);
      nearHue(top.h, h, `club hue ${h}° survives to the ramp`);
      nearSat(top.s, sat, `club sat ${sat} survives inside the window`);
      nearL(
        top.l,
        CrownDeep[0].light * dim,
        `club ramp takes the ladder's lightness × clubDim(${h}°), never the hex's`,
      );
    }
  }

  // The pull-down bites where it must and holds off where it must not: a blue
  // club keeps the league ladder's own lightness, a yellow one is pulled down.
  assert.equal(clubDim(230), 1, 'blue is outside the high-luma window');
  assert.ok(clubDim(60) < 0.6, 'yellow takes the deepest pull-down');

  // Saturation OUTSIDE the window is clamped to it, both ends.
  for (const [sat, want] of [[100, CrownDeepSat.max], [10, CrownDeepSat.min]]) {
    const top = parseHex(clubCrownTheme(hslHex(200, sat, 50)).stops[0].color);
    nearSat(top.s, want, `club sat ${sat} clamps to ${want}`);
  }

  // Every fallback tint the catalogue actually serves, plus graphite itself —
  // the colour a club with nothing usable wears (steel-blue by design).
  for (const [slug, hex] of TINT_FALLBACK_ENTRIES) {
    proveClubInk(`TINT_FALLBACK ${slug}`, clubCrownTheme(hex));
  }
  proveClubInk('graphite', clubCrownTheme(Colors.dark.washGraphite));

  // Garbage in, brand out — by REFERENCE, the no-league path's own contract.
  for (const junk of ['', 'not-a-hex', '#12', 'rgb(1,2,3)']) {
    const theme = clubCrownTheme(junk);
    assert.equal(theme.stops, CrownGrad, `'${junk}' must return the literal CrownGrad`);
    assert.equal(theme.pools, Mesh, `'${junk}' must return the literal Mesh`);
    assert.equal(theme.tone, 'bright', `'${junk}' wears the brand ramp, so DARK ink`);
  }

  console.log(`  club crown: hue sweep, ${TINT_FALLBACK_ENTRIES.length} fallbacks, graphite ok.`);

  console.log(`\nleague-theme: all assertions passed over ${entried.length} banded leagues.`);
} finally {
  rmSync(out, { recursive: true, force: true });
}
