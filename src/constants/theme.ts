/**
 * Alta Gama FC — native design tokens.
 * Drop-in replacement for src/constants/theme.ts (ADR 0006 / 0014).
 * Dark-only for v1: the design has no light ground. Keep Colors.light as an
 * alias of dark until a light theme is actually designed, so nothing renders
 * white-on-white if the OS is in light mode.
 */

const dark = {
  // Surfaces
  background: '#0a0b0c',        // page / scroll ground
  card: '#15171a',              // grouped card, sheet body, tab-bar chrome
  raised: '#1e2126',            // segmented selection, avatar, secondary button
  raisedAlt: '#242830',         // control track inside a card (sheet segmenteds)
  rowActive: '#12161a',         // row of a subscribed club / live fixture
  // The match-events panel, one step BELOW `card` — an expansion reads as
  // recessed into the row it came from, not stacked on top of it (ADR 0045).
  sunken: '#101317',
  glyph: '#39404a',             // the player silhouette, on `raisedAlt`

  // Hairlines
  hairline: 'rgba(255,255,255,0.05)',      // row separators in a list
  hairlineMid: 'rgba(255,255,255,0.07)',   // section rules, tab-bar top border
  hairlineStrong: 'rgba(255,255,255,0.12)', // outlined button, avatar ring

  // Ink
  text: '#f4f6f6',
  textSecondary: '#a3abb0',
  textDim: '#8fa0a6',
  textFaint: '#59626a',
  textMuted: '#7c858b',
  /**
   * The label and count of an INERT control — today the match-events tab whose
   * group holds nothing (ADR 0046).
   *
   * ⚠ Dimmer than `textFaint`, and it has to be: `textFaint` is what an *idle*
   * tab's count already uses, so borrowing it makes "you can tap this, there is
   * nothing under it" and "you can tap this" the same colour.
   */
  textGhost: '#3d444a',

  // Brand + status
  accent: '#c8f25a',            // the ONE carry-over from the web app
  onAccent: '#101806',
  accentWash: 'rgba(200,242,90,0.14)',
  accentRing: 'rgba(200,242,90,0.45)',
  live: '#ff5c47',              // in-progress marker, destructive
  liveWash: 'rgba(255,92,71,0.14)',
  danger: '#ff5c47',

  // Notification alert types (ADR 0036). ⚠ `moved` is the same hex as `bandUel`
  // and that is a coincidence, not a relationship — one means "Europa League
  // qualification", the other means "this kickoff shifted". Aliasing them would
  // make a band recolour silently repaint a lock-screen eyebrow.
  moved: '#6fc9ff',
  movedWash: 'rgba(111,201,255,0.14)',
  postponed: '#ff8f6b',
  postponedWash: 'rgba(255,143,107,0.14)',
  postponedRing: 'rgba(255,143,107,0.36)',

  // Disciplinary cards, in the match-events timeline (ADR 0045).
  // ⚠ `cardRed` is the same hex as `live` and that is a COINCIDENCE, not a
  // relationship — the same trap `moved`/`bandUel` below already carries. One
  // means "a player was sent off", the other "this match is in play"; aliasing
  // them makes a liveness recolour silently repaint every red card.
  cardYellow: '#f2c14e',
  cardRed: '#ff5c47',

  // Qualification bands (per-league CONFIG, never position arithmetic)
  bandUcl: '#c8f25a',
  bandUel: '#6fc9ff',
  bandConf: '#b79bff',
  bandRel: '#ff6b5e',

  // Form chips
  formWin: '#c8f25a',
  formDraw: '#3a4652',
  formLossBorder: 'rgba(255,107,94,0.7)',
} as const;

export const Colors = { dark, light: dark } as const;
export type ThemeColor = keyof typeof dark;

/**
 * The league header band in FINISHED TODAY — one entry per competition we hold
 * fixtures for, keyed by **API slug** (`laliga`, not `la-liga`; `segunda`; see
 * `lib/cronogol/leagues.ts`). Never key on the provider's `name`.
 *
 * ⚠ These are the leagues' own brand colours, deliberately NOT `LeagueRef.accentColor`
 * from the backend — that is null on Serie A and segunda and cannot carry a
 * gradient (ADR 0062). Segunda shares LaLiga's red by choice. ⚠ LaLiga's is a
 * DARK red, not the brand `#FF4B44`: the league mark is itself that red and
 * vanished on it — the band must sit well below the mark's own tone. A slug missing here
 * renders the neutral header; that is the fallback, not a bug.
 */
export const LeagueBand = {
  laliga: { solid: '#A8231F' },
  // ⚠ `segunda`, not `segunda-division` — the API's slug, whatever the docs' prose says.
  segunda: { solid: '#A8231F' },
  'premier-league': { solid: '#37003C' },
  bundesliga: { solid: '#FF404A' },
  'serie-a': { gradient: ['#225696', '#0D8EFE'] },
} as const satisfies Record<string, LeagueBandSpec>;
export type LeagueBandSpec = { solid: string } | { gradient: readonly [string, string] };

/** 4-point scale. Screen gutter is 20; cards pad 16–18; sheets pad 20. */
export const Spacing = {
  half: 2, one: 4, two: 8, three: 12, four: 16, five: 20, six: 24, seven: 32, eight: 44,
} as const;

export const Radius = {
  sheet: 28, card: 22, group: 20, tile: 18, control: 14, chip: 12, seg: 9, chipSm: 6, rail: 2, pill: 999,
} as const;

/**
 * Type: system font (SF Pro) throughout — no expo-font, no licensing, and it
 * inherits Dynamic Type. Sizes are the iOS scale, not the web app's.
 * Every numeric run sets fontVariant: ['tabular-nums'].
 */
export const Type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.8 },
  title3: { fontSize: 22, fontWeight: '700', letterSpacing: -0.55 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  bodyStrong: { fontSize: 15, fontWeight: '600', letterSpacing: -0.15 },
  body: { fontSize: 15, fontWeight: '400' },
  callout: { fontSize: 14.5, fontWeight: '600', letterSpacing: -0.15 },
  footnote: { fontSize: 13.5, fontWeight: '400' },
  caption: { fontSize: 12.5, fontWeight: '500' },
  micro: { fontSize: 11.5, fontWeight: '500' },
  /** Uppercase eyebrows / column heads. Always with letterSpacing. */
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase' },
  eyebrowSm: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase' },
  /**
   * The one eyebrow meant to be READ, not scanned: the next-up card's date and
   * zone lines. At `eyebrowSm` they were 9.5pt beside a 32pt time and lost the
   * comparison — and the zone line is the sentence that stops a kickoff being
   * read as the stadium's local time (ADR 0034).
   */
  eyebrowLg: { fontSize: 12.5, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  /** Scores, kickoff times, countdowns. */
  scoreLarge: { fontSize: 38, fontWeight: '700', letterSpacing: -1.5 },
  kickoff: { fontSize: 32, fontWeight: '700', letterSpacing: -1.1 },
  /**
   * The upcoming card's kickoff (ADR 0043). `kickoff` at 32pt is the next-up
   * HERO's size — six list cards setting it would out-shout the card the
   * screen leads with; `numeralLg` at 19 loses to the 22pt club name beside
   * it. Shares its metrics with `countdownNum` today and must NOT borrow that
   * name: the countdown is free to move without dragging every kickoff along.
   */
  kickoffSm: { fontSize: 26, fontWeight: '700', letterSpacing: -0.9 },
  /**
   * The countdown's digits and its unit letters. Smaller than `kickoff` because
   * the row carries four groups (`1d 18h 04m 12s`), not one time (ADR 0034).
   */
  countdownNum: { fontSize: 26, fontWeight: '700', letterSpacing: -0.8 },
  countdownUnit: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  numeral: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  /**
   * The jornada row's score/kickoff (ADR 0035). At `numeral` the number sat at
   * the same weight as the two club names beside it and the row had no anchor;
   * 19pt against 15pt names makes the number the thing you scan down. Lighter
   * than `numeral` (700 vs 800) because it is bigger — the two read the same.
   *
   * ⚠ `numeral` stays at 16: `ScoreLine size='row'` and `SeasonSpine` are
   * both sized against it. (The upcoming cards left it for `kickoffSm` in
   * ADR 0043 — they are cards now, not rows.)
   */
  numeralLg: { fontSize: 19, fontWeight: '700', letterSpacing: -0.5 },
  /**
   * The match-events timeline (ADR 0045). Two steps of its own because the
   * panel is a dense list inside a row: `bodyStrong` (15) at eleven rows deep
   * out-weighed the club names in the row above it, and `caption` (12.5/500)
   * lost the player name to its own detail line.
   *
   * ⚠ The detail line is `micro` and the crest column is `eyebrowSm` — both
   * already match the spec's values, so they are reused rather than copied.
   */
  eventName: { fontSize: 13, fontWeight: '600', letterSpacing: -0.13 },
  /** Always `tabular` — the minute column is read as a column. */
  eventMinute: { fontSize: 11, fontWeight: '700' },
  /**
   * The events panel's group tabs (ADR 0046).
   *
   * ⚠ NOT `eventMinute`, which happens to share 11/700 today. That token is
   * documented "always tabular" and is measured against `eventMinuteColumn`;
   * the two must be free to move apart without one dragging the other.
   *
   * ⚠ Sentence case, not an eyebrow. `eyebrowSm` uppercases, and `GOLES` beside
   * `TARJETAS` in four quarter-width segments is the layout that truncates.
   */
  eventTab: { fontSize: 11, fontWeight: '700', letterSpacing: 0.22 },
  /** The count beside it. ⚠ A number — always with `tabular`. */
  eventTabCount: { fontSize: 10, fontWeight: '700' },
} as const;

/** Hit targets: nothing interactive below 44. Switch is 51×31 (system). */
export const Size = {
  minTouch: 44, rowSkeleton: 44, pill: 34, switchW: 51, switchH: 31, switchKnob: 27,
  crestRow: 26, crestList: 30, crestCard: 40, crestHero: 58,
  /**
   * The league mark on a FINISHED TODAY band. ⚠ Must stay below `crestRow`:
   * the band is a divider and has to read thinner than the match rows it
   * separates — 18 + 2×`Spacing.two` = 34pt against a 50pt row (ADR 0062).
   */
  leagueBandMark: 18,
  /**
   * The next-up card's pairing. Deliberately larger than `crestCard` — that
   * one is the list/row size and stays where it is (ADR 0034). `versusBadge`
   * is the accent ring that sits between the two.
   */
  crestNext: 64, versusBadge: 34,
  tabIcon: 22, avatar: 36, sheetGrabber: 38,
  /**
   * Player portraits. ⚠ The SOURCE aspect ratio varies by league — 256×278
   * (LaLiga), 110×140 (Premier League), and an operator stopgap has no
   * guaranteed size at all. These are the FRAME; the image is fitted inside
   * it, never stretched to it.
   */
  playerThumb: 34, playerPhotoW: 104, playerPhotoH: 116,
  /** League filter tiles: artwork only, four across inside the screen gutter. */
  leagueTileW: 80, leagueTileH: 56, leagueMarkW: 52, leagueMarkH: 28,
  /**
   * Onboarding's league chips — artwork PLUS the league's name, 2-up (ADR 0056).
   * Bigger than the filter tile because it is a first-run choice, not a filter.
   *
   * ⚠ `leagueChipMarkH` is a HEIGHT ONLY and there is deliberately no matching
   * width. The four marks have wildly different aspect ratios — LaLiga's LL
   * monogram is 1:1, the Premier League's is ~4:5 — so capping height keeps them
   * optically the same size, while capping width shrinks the portrait ones to
   * slivers. `leagueMarkW`/`leagueMarkH` above are a fixed box because that row
   * is artwork-only and needs every tile identical; this one is not.
   */
  leagueChipH: 84, leagueChipMarkH: 32,
  /**
   * The time column, per clock format. Fixed *within* a format so no single row
   * reflows against its neighbours — every row on screen shares one `clock`, so
   * one of these two is in force at a time and the pairing column always aligns.
   *
   * ⚠ The 12-hour number is measured, not guessed (ADR 0035): `11:00 am` at
   * `Type.numeralLg` is ~83pt, and at 76 it pushed the crest pair and the whole
   * name column right on that ONE row. `IN PLAY` beneath it is ~47pt and never
   * binds.
   *
   * ⚠ They are two tokens rather than one because 88 charged every reader for a
   * width only 12-hour readers need, and the row cannot spare it: at 40pt crests
   * the 24pt difference is `Espanyol de Barcelona` fitting or truncating. The
   * default clock is `24`.
   *
   * ⚠ What sets the 24-hour number is the CAPTION, not the time: `21:00` is
   * ~52pt but `EN JUEGO` is ~59pt. Measured on the simulator. Shrinking this to
   * fit the clock alone wraps the in-play caption in Spanish.
   */
  timingColumn: 64,
  timingColumn12: 88,
  /**
   * The match-events timeline (ADR 0045).
   *
   * ⚠⚠ **The glyph slot is FIXED at 18 × 15 for every event type.** Names
   * align down the timeline whatever the mix of goals, cards and subs.
   * **Never size the slot to the glyph** — a card is 11pt wide and a goal
   * disc 24, and sizing to content ragged every name in the panel.
   *
   * ⚠ `crestEvent` is 22, below `crestRow` (26): the side crest here is a
   * column marker inside an already-nested list, not an identification.
   */
  eventGlyphW: 18,
  eventGlyphH: 15,
  /**
   * ⚠ **38, not the spec's 30.** Measured on the simulator, not derived: at 30
   * a stoppage-time minute truncated to `45…`, because `45+2′` is six glyphs
   * where `63′` is three. The spec's 30 was set against HTML, which overflows
   * a fixed width silently rather than ellipsing it.
   *
   * ⚠ Widening the column does NOT break the design's alignment rule — it is
   * still FIXED, which is the whole point. It costs the name block 8pt, which
   * that column can afford in a way the parent row's cannot.
   */
  eventMinuteColumn: 38,
  crestEvent: 22,
  /**
   * A group tab's height (ADR 0046).
   *
   * ⚠ Below `minTouch` on purpose, and the segments carry `hitSlop` to make up
   * the difference. The control exists to SAVE panel height — a 44pt track
   * spends most of what grouping the rows won back.
   */
  eventTab: 28,
  /** The disclosure chevron. ⚠ Its 44pt hit target is the ROW, not this. */
  chevron: 11,
  /**
   * The vertical rule between a score's two digits (ADR 0044), per size. Set
   * against the digits' cap height on the simulator, not by arithmetic: a rule
   * as tall as the line box reads as a table border, and one as short as the
   * gap reads as a stray pixel. It wants to be a little under the cap.
   */
  scoreRuleBoard: 30,
  scoreRuleRowLg: 17,
  scoreRuleRow: 14,
  /**
   * Its thickness. ⚠ NOT `hairlineWidth`: at 0.33pt beside a 38pt numeral the
   * rule disappears and the score reads as two unrelated numbers. The board
   * rule is heavier than a row's for the same reason the digits are.
   */
  scoreRuleWidthBoard: 2,
  scoreRuleWidth: 1,
} as const;

export const BottomTabInset = 80; // matches the designed bar height (ADR 0005 note)
export const MaxContentWidth = 520;
