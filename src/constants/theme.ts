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

  /**
   * The DOUBLE BEZEL, and it lives on exactly one component: the Clubs rail's
   * bubble (ADR 0082).
   *
   * `bezelFill` is the shell — the band between the bubble's club-colour
   * hairline and its core. `bezelHighlight` is the core's lit top edge, which is
   * what makes the two rings read as concentric rather than as a flat band
   * around a disc.
   *
   * ⚠ **Not a general surface, and not a fifth step on the ladder.** The ladder
   * is still `background → card → raised → raisedAlt`, and
   * [0081](.claude/decisions/0081-account-sheet-redesign.md)'s refusal of nested
   * card shells still governs every CARD in the app — the search field and the
   * browse tray are one `card` surface each. These two exist because a bubble is
   * a physical object with a rim, not a card.
   *
   * ⚠ `bezelHighlight` is drawn as a `borderTopColor` on a transparent-bordered
   * overlay, never as an inset shadow: React Native has no `inset` shadow, and a
   * top border on a rounded view is what traces the lit arc.
   */
  bezelFill: 'rgba(255,255,255,0.06)',
  bezelHighlight: 'rgba(255,255,255,0.14)',

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

  /**
   * The Live Activity card's own ground and its floodlight pool (ADR 0085).
   *
   * ⚠⚠ **Nothing in the app draws these — the WIDGET EXTENSION does.** They live
   * here anyway because `targets/_shared/Tokens.swift` is a hand-maintained copy
   * of this file (HANDOFF trap 15), and its own header says every number in it
   * is a copy of one here. A colour that exists only in the Swift is the drift
   * that rule exists to stop, in the direction nobody checks.
   *
   * ⚠ `activityGround` is a shade darker than `background` (`#07080a` against
   * `#0a0b0c`) and that is deliberate: the card sits on the reader's wallpaper,
   * not on the app, and the extra step is what keeps the lime radials above it
   * reading as light rather than as a lighter grey.
   *
   * ⚠ `activityPool` exists to keep the lime OFF the crests — the two radials
   * fall from the top corners onto exactly where the badges sit.
   */
  activityGround: '#07080a',
  activityPool: '#0b2820',
  activityHairline: 'rgba(255,255,255,0.09)',

  // The club-colour wash behind the next-up card and the club header (ADR 0068).
  // `washGraphite` is the neutral a club lands on when its own hexes are
  // unusable (near-black, near-white, or absent on one side of a pairing that
  // still has a colour on the other). The three inks are what the card's
  // chrome switches to ON a wash: white, not lime, so the club colour and the
  // brand accent never share a frame.
  washGraphite: '#2b323b',
  washInk: 'rgba(255,255,255,0.72)',
  washRing: 'rgba(255,255,255,0.35)',
  washBadge: 'rgba(255,255,255,0.10)',

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

  // The Starting XI pitch (ADR 0065). The two grounds are the web builder's
  // `xi-pitch` / `xi-turf`; lines and stripes are washes over them.
  pitchArt: '#0f1216',
  pitchTurf: '#17301d',
  pitchLineArt: 'rgba(200,242,90,0.34)',
  pitchLineTurf: 'rgba(255,255,255,0.34)',
  pitchStripeArt: 'rgba(200,242,90,0.05)',
  pitchStripeTurf: 'rgba(255,255,255,0.045)',
  // An EMPTY slot token: a dark scrim so the label reads on turf, and a dashed ring.
  slotEmpty: 'rgba(10,11,12,0.42)',
  slotRing: 'rgba(255,255,255,0.42)',
  // A filled token's inner border, and the scrim under a name caption.
  slotEdge: 'rgba(10,11,12,0.35)',
  captionScrim: 'rgba(10,11,12,0.55)',
  // The Clear action. ⚠ Softer than `danger`: it sits in a toolbar of four
  // quiet tiles and `danger` there out-shouts the lime it is next to.
  clearInk: '#ff8f7c',
  // The export card ground — one step above `background` so the pitch's own
  // ground still reads as recessed.
  cardGround: '#101215',
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

/**
 * The taming rule for a club's own colour (ADR 0068), consumed by
 * `lib/cronogol/club-wash.ts`. `TeamView.colorPrimary` is "verbatim and
 * unvalidated" — Valencia is `#000000`, RB Leipzig `#ffffff`, Villarreal
 * `#ffd301` — so every hex is pulled into ONE lightness band before it goes
 * behind white text. All values are HSL percentages except `yellowHue`
 * (degrees) and `seam` (gradient offsets, 0–1).
 *
 * ⚠ Yellow and green are capped harder than every other hue: at the same
 * lightness they read a step lighter, and Villarreal's gold and Betis's green
 * both out-shouted the crest on them at the blue cards' cap.
 */
/**
 * The scrim over the News lead's picture (ADR 0070): the page ground, clear
 * until `clearTo`, `midOpacity` by `mid`, and solid at the foot so the text
 * sits on the same ground as every other card. Never a flat overlay — a
 * picture under 55 % black is a dead picture. Opacities are passed as
 * `WashStop.opacity`, never baked into an `rgba()` — see the atom's warning.
 */
export const NewsScrim = {
  color: '#0a0b0c',
  clearTo: 0.25,
  mid: 0.62,
  midOpacity: 0.72,
} as const;

export const ClubWash = {
  // ⚠ Measured on the simulator, not derived: the preview was set at 26–38 and
  // the device rendered every corner a step louder than the browser had — a
  // solid slab rather than a wash. 22–30 is where it matches the approved look.
  lightMin: 22,
  lightMax: 30,
  lightMaxBright: 26,
  satMin: 45,
  /** Outside these a hex is "extreme" — the secondary is tried, then graphite. */
  extremeLow: 10,
  extremeHigh: 85,
  /** Yellow through green — the hues that read lighter than their L says. */
  brightHue: [40, 170],
  /** Where the two-club diagonal returns to plain `card` between the colours. */
  seam: [0.42, 0.58],
  /** Where the club header's vertical wash has fully returned to `background`. */
  heroEnd: 1,
} as const;

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

  /**
   * The Starting XI board (ADR 0065). A filled token's shirt number, an empty
   * token's position label, and the two captions under them. Sizes are the
   * handoff's, measured against the 46pt token; they are not on the scale
   * because nothing else on screen is 46pt.
   */
  xiNumeral: { fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  xiSlotLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  xiCaption: { fontSize: 11.5, fontWeight: '600', letterSpacing: 0.2 },
  /** The `SHAPE` word beside the formation in the toolbar. */
  xiToolbarLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 1.1, textTransform: 'uppercase' },
  /** The shirt number on a portrait token's corner badge (ADR 0072), and the rail tile's. */
  xiBadge: { fontSize: 9.5, fontWeight: '800' },
  xiRailBadge: { fontSize: 8, fontWeight: '800' },
  /**
   * The Clubs rail (ADR 0082). A bubble's name caption, and the rank badge on it.
   *
   * ⚠ `railName` is NOT `Type.caption` (12.5/500), which it nearly is: the
   * caption is prose weight and these 12pt names sit under 88pt discs where 500
   * read as a hint rather than a label. Its negative tracking is what keeps
   * `R. Sociedad` on one line in an 88pt box.
   *
   * ⚠ `rankBadge` is a NUMBER and is always drawn `tabular` — `#4` and `#11`
   * sit at the same corner of neighbouring bubbles. Not `eyebrowSm`, which it
   * shares 9.5/800 with today: that token uppercases and tracks at 1.3 for a
   * word, and `#11` at 1.3 puts a visible gap inside the number.
   */
  railName: { fontSize: 12, fontWeight: '600', letterSpacing: -0.18 },
  rankBadge: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
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
   * The account sheet's identity avatar (ADR 0081) — the same disc as `avatar`,
   * at the size a heading sits beside rather than a large title.
   *
   * ⚠ Not a multiple of `avatar`: the header's 36 is a hit target that must
   * clear the title's cap height, this one is measured against `Type.title3`.
   */
  avatarLg: 64,
  /**
   * A reminder lead-time chip (ADR 0081). Below `minTouch` like `eventTab`, and
   * for the same reason — three of them sit inside one row of a group — so they
   * carry `hitSlop` to make the difference up.
   */
  leadChip: 32,
  /**
   * One option of the account sheet's segmented control (ADR 0081).
   *
   * ⚠ **Fixed, not `flex: 1`.** The control sits in a row beside a label, and a
   * flexible track eats the whole row and pushes the label off it — which is
   * exactly what the first build did to `Idioma` and `Reloj`. A fixed option
   * width also means the sliding thumb is arithmetic, with nothing to measure
   * and no wrong position on first paint.
   *
   * ⚠ Measured against the widest label this draws, `24 h` at `Type.callout`
   * (~33pt). A control with a long option and a short one cannot use this.
   */
  segOption: 52,
  /**
   * News row thumbnails (ADR 0064): the two rows on the Today card and every
   * row on the News screen. Squares, cover-cropped — the publisher's originals
   * are 16:9 and any size, and a fixed frame is what stops a missing or
   * hotlink-blocked image from reflowing the headline beside it.
   */
  newsCardRow: 56,
  /**
   * The Today card's lead picture (ADR 0071): full card width at 2:1.15, ~200pt
   * tall at 393. Deliberately SHORTER than the page's `newsLeadRatio` — this is
   * one card on a board of score cards and must stay below the next-up card in
   * weight.
   */
  newsCardLeadRatio: 2 / 1.15,
  /**
   * The News screen's front page (ADR 0070). The lead's frame is a hair
   * taller than square — 4:4.6 — so a three-line headline and a two-line
   * excerpt fit UNDER the picture's subject rather than over it; the tiles'
   * picture is 16:10, close to the publishers' native 16:9 with the top and
   * bottom trimmed rather than the sides.
   */
  newsLeadRatio: 4 / 4.6,
  newsTileRatio: 16 / 10,
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
   * Onboarding's league PILLS — artwork PLUS the league's name, in a horizontal
   * row (ADR 0076, replacing 0056's 2-up chip grid).
   *
   * ⚠ `leaguePillMarkH` is a HEIGHT ONLY and there is deliberately no matching
   * width. The four marks have wildly different aspect ratios — LaLiga's LL
   * monogram is 1:1, the Premier League's is ~4:5 — so capping height keeps them
   * optically the same size, while capping width shrinks the portrait ones to
   * slivers. `leagueMarkW`/`leagueMarkH` above are a fixed box because that row
   * is artwork-only and needs every tile identical; this one is not.
   */
  leaguePillH: 40, leaguePillMarkH: 20,
  /**
   * The onboarding picker's crest — 3-up tiles, crest above the name (ADR 0076).
   * A step above `crestCard` because the crest IS the tile's identity here.
   */
  crestPick: 44,
  /** The onboarding footer's primary button, and the crest discs inside it. */
  ctaH: 50, ctaDisc: 34, ctaDiscCrest: 24,
  /** The picked badge on a picker tile. */
  pickBadge: 18,
  /** The Alta Gama mark on the welcome screen, and the icon tile on the alert preview. */
  markWelcome: 126, alertIconTile: 38,
  /** The tinted glyph tile on the alert primer's rows. */
  alertGlyphTile: 34,
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
   * The goal column on a FINISHED TODAY row (ADR 0069): one digit per line,
   * right-aligned, and FIXED so the column lines up down a league group. Two
   * digits at `Type.numeral` — measured on the simulator, and a 10-goal game
   * is the widest this column will ever be asked to hold.
   */
  goalColumn: 22,
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

  /**
   * The Starting XI board (ADR 0065). ⚠ `xiToken` is THE number the formation
   * tables were measured against — see `features/starting-xi/formations.ts`.
   * Change it and every table needs re-measuring.
   */
  xiToken: 46,
  /** The name caption under a token, capped so neighbours never touch. */
  xiCaption: 66,
  /** The selection halo drawn outside the ring. */
  xiHalo: 4,
  /** The pitch box: 361 wide inside a 393 screen, 424 tall. Height follows width by this ratio. */
  xiPitchRatio: 424 / 361,
  /** A squad card on the rail. */
  xiRailCard: 74,
  xiRailNum: 30,
  /** The rail's bottom clearance so the last cards clear the corner radius. */
  xiRailInset: 58,
  /** The club-page row's glyph tile, and the glyph inside it. */
  xiRowTile: 38,
  xiRowGlyph: 20,
  /** The toolbar's icon tiles are `minTouch`; the icon inside is this. */
  xiToolIcon: 19,
  /** The line-filter chip. */
  xiFilterH: 30,
  /** A look preview tile in the Look sheet. */
  xiLookPreview: 96,
  /**
   * The number badge on a portrait token (ADR 0072), at board size; the card
   * scales it with the ring. ⚠ Not part of the formation tables — it sits
   * INSIDE the 46pt footprint.
   */
  xiBadge: 18,
  /** The same badge on a 30pt rail tile. */
  xiRailBadge: 14,

  /**
   * The Clubs screen (ADR 0082).
   *
   * The rail's bubble, its ring padding, the crest floating in it, the lime
   * check and the rank badge. ⚠ The bubble's radius is `clubBubble / 2` at the
   * call site rather than a token: it is a circle, and a radius that can drift
   * from the diameter is a bug waiting to be typed.
   */
  clubBubble: 88,
  clubBubbleRing: 4,
  crestBubble: 54,
  bubbleCheck: 26,
  bubbleRank: 20,
  /** The browse row's crest. */
  crestBrowse: 32,
  /** The follow pill, and the disc holding its `+`. */
  followPillH: 32,
  followPillDisc: 22,
} as const;

/**
 * Durations, in milliseconds (ADR 0081). The app's motion budget is small and
 * deliberately so — platform defaults, the skeleton's pulse, and entrances —
 * but until now every duration was a literal at its call site, so there was no
 * way to see the vocabulary or change it. These are those literals, named.
 *
 * ⚠ **Every animation reading these must still branch on `useReducedMotion()`.**
 * A token cannot enforce that, and an unguarded animation has already been a
 * bug here once (the skeleton, before 2026-08-25).
 *
 * ⚠ `enter` is the existing `StatusBanner` fade-down (220) rounded up for a
 * taller travel; `welcome`'s 360 stays at its own call site, because a hero is
 * not a section.
 */
export const Motion = {
  /** A control settling — the segmented thumb, a chip. */
  quick: 160,
  /** The default: a panel opening, a group reflowing. */
  base: 220,
  /** A section arriving on mount. */
  enter: 260,
  /** Between staggered siblings. Small — eight blocks must not read as a queue. */
  stagger: 45,
} as const;

export const BottomTabInset = 80; // matches the designed bar height (ADR 0005 note)
export const MaxContentWidth = 520;
