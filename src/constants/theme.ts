/**
 * Alta Gama FC — native design tokens.
 * Drop-in replacement for src/constants/theme.ts (ADR 0006 / 0014).
 * Dark-only for v1: the design has no light ground. Keep Colors.light as an
 * alias of dark until a light theme is actually designed, so nothing renders
 * white-on-white if the OS is in light mode.
 */

const dark = {
  // Surfaces
  // ⚠ `#0f1316`, not 0015's `#0a0b0c` — the crown + aurora shell (ADR 0087)
  // lifts the ground a step so the mesh's colour pools read as light, not grey.
  background: '#0f1316',        // page / scroll ground, under the aurora mesh
  // ⚠ No longer the sheet body (that is `sheetGround`, ADR 0093) and no longer
  // the default card (that is `glassFill`, ADR 0087). Kept at its value as the
  // OPAQUE BASE: under a club-colour wash (glass would double-blend with the
  // mesh), the matchday strip's future pill, news chips, and tab-bar chrome.
  card: '#15171a',
  raised: '#1e2126',            // segmented selection, avatar, secondary button
  raisedAlt: '#242830',         // control track inside a card (sheet segmenteds)
  rowActive: '#12161a',         // row of a subscribed club / live fixture
  glyph: '#39404a',             // the player silhouette, on `raisedAlt`


  /**
   * The GLASS system (ADR 0087). `glassFill` + a `Size.glassBorder` hairline of
   * `glassLine` replace the charcoal `card` slab on every BODY card — spread
   * `Surfaces.glass` rather than retyping the pair. `glassFillDim` is the
   * quieter slab: full-bleed day headers, segmented tracks.
   *
   * ⚠ Glass is a VIEW background, never an SVG stop: `react-native-svg` paints
   * an rgba stop opaque (HANDOFF trap 42), and a wash needs the opaque `card`
   * base under it anyway — glass under a wash double-blends with the mesh.
   */
  glassFill: 'rgba(255,255,255,0.06)',
  glassLine: 'rgba(255,255,255,0.11)',
  glassFillDim: 'rgba(255,255,255,0.05)',
  /**
   * What an expansion recesses INTO now (ADR 0087, carrying 0045's intent).
   * `sunken`'s fixed hex was a step below the OLD ground; a translucent black
   * reads as recessed on any ground, the mesh's colour pools included.
   */
  recess: 'rgba(0,0,0,0.28)',
  // The Today crown's dark glass plate for the live match (ADR 0088).
  plateDark: 'rgba(4,9,8,0.8)',
  plateLine: 'rgba(255,255,255,0.18)',
  plateTop: 'rgba(255,255,255,0.12)',

  /**
   * Ink ON THE CROWN — the app's one inverted surface (ADR 0087).
   *
   * ⚠ NOT `onAccent`. That token is the ink of an on-lime CONTROL (a button, a
   * check, the strip's active pill) and is hand-copied into
   * `targets/_shared/Tokens.swift` (trap 15); the crown is a SURFACE with its
   * own set. APP-SHELL.md's "onAccent / onAccentDim / onAccentLine /
   * onAccentFill" table maps onto these names one for one.
   *
   * ⚠ Dark ink lives in the crown's BRIGHT BAND only — lime through mid-teal,
   * roughly the top half. Past the midpoint the gradient is dark green and
   * content there keeps the normal dark-theme tokens: black ink dies there
   * exactly as grey ink dies on the lime.
   */
  onCrown: '#0d1a08',
  onCrownDim: 'rgba(11,22,8,0.62)',
  onCrownLine: 'rgba(11,22,8,0.24)',
  onCrownFill: 'rgba(11,22,8,0.16)',
  // The SELECTED league chip on the crown: a near-black plate, the mark back in
  // full colour, the label in bright lime — the system's one double inversion
  // (ADR 0089).
  crownChipOn: 'rgba(11,22,8,0.82)',
  crownChipOnLine: 'rgba(11,22,8,0.9)',
  crownChipInk: '#dcff7a',

  /**
   * The double-bezel TRAY (ADR 0090/0091): an outer glass band wrapped around
   * an opaque inner surface, `Size.trayPad` apart. Supersedes the bubble-only
   * scope of the bezel pair above — the tray is a sanctioned card shape now
   * (Clubs search + browse, the club page's four trays).
   */
  trayFill: 'rgba(255,255,255,0.045)',
  trayLine: 'rgba(255,255,255,0.07)',
  trayInner: '#13161a',
  trayInnerTop: 'rgba(255,255,255,0.06)',

  // Opaque grounds that survive the glass migration (ADR 0087/0093).
  sheetGround: '#101316',       // modal sheets — glass over a scrim reads muddy
  tabBar: '#0a0b0c',            // the bar sits UNDER the mesh, a step darker
  segThumb: '#22262c',          // segmented thumb (club page)
  calRow: '#1b1f24',            // the club page's calendar row
  /**
   * The score chip's ground on a glass row (ADR 0044's chip, re-grounded).
   * ⚠ Still NEUTRAL and must stay so: painting it `live`/`liveWash` makes every
   * finished score in a list look current (trap 8).
   */
  scoreChip: 'rgba(255,255,255,0.07)',

  /**
   * The Clubs rail bubble's liquid-glass shell (ADR 0090) — white glass, no
   * club-colour radial. These are the OVERLAYS; the shell body is a `GlassView`
   * where liquid glass is available and a flat `bubbleShell` fill where not.
   */
  bubbleShell: 'rgba(255,255,255,0.16)',
  bubbleRim: 'rgba(255,255,255,0.42)',
  bubbleTop: 'rgba(255,255,255,0.6)',
  bubbleRankFill: 'rgba(255,255,255,0.62)',
  bubbleRankLine: 'rgba(255,255,255,0.7)',
  bubbleCheckRim: 'rgba(255,255,255,0.55)',

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
  /**
   * A disc nested INSIDE an accent control (ADR 0091's alerts row): the dark
   * one for a solid-lime row, the lighter lime for a wash row. ⚠ `onAccentFill`
   * is `onAccent` at 13 % — the ink's own colour, so the disc reads as a hole
   * in the lime rather than a second colour.
   */
  onAccentFill: 'rgba(16,24,6,0.13)',
  accentWashStrong: 'rgba(200,242,90,0.18)',
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

/**
 * The aurora mesh (ADR 0087): three static elliptical radials on the ground,
 * drawn ONCE per screen by `MeshGround` behind the scroll view — never per
 * card, never inside the scroll. Positions and extents are fractions of the
 * screen box; each pool holds `alpha` at its centre and is gone by `fade` of
 * its own extent.
 *
 * ⚠ `alpha` rides `WashStop.opacity` at the consumer, never an rgba stop
 * colour (trap 42).
 */
export const Mesh = [
  { cx: 0.92, cy: 0.22, rx: 0.64, ry: 0.4, color: '#c8f25a', alpha: 0.16, fade: 0.62 },
  { cx: -0.12, cy: 0.48, rx: 0.78, ry: 0.46, color: '#105c4a', alpha: 0.6, fade: 0.66 },
  { cx: 1.08, cy: 0.86, rx: 0.72, ry: 0.42, color: '#1c546c', alpha: 0.5, fade: 0.66 },
] as const;

/**
 * The same mesh, re-aimed for a WIDGET tile (ADR 0104). Nothing in this app
 * reads it — it exists here because `targets/_shared/Tokens.swift` may only
 * copy values that are named on this side, and the widget extension cannot
 * import anything from it.
 *
 * ⚠⚠ **Same three colours and the SAME THREE ALPHAS as `Mesh`. Only the
 * geometry moved, and that is the finding.** `Mesh`'s pools are centred at
 * `cx` −0.12 and 1.08 — comfortably off a 930pt screen, whose visible area
 * still catches their cores. A 158pt tile catches only their tails, so the
 * first build of 0104 rendered a dead grey-green centre with colour trapped in
 * the corners, under exactly the values that look right on a screen. Pulling
 * the centres onto the tile's own edges and widening each fade puts the same
 * light back where the tile actually is.
 *
 * ⚠ Calibrated, not eyeballed: sampled against the real Today screen's body
 * ground (`#0f3832` … `#101f1e`, green channel typically 31–45), these land at
 * p90 green 45 against `Mesh`'s 38 — the top of the app's own range rather
 * than past it. Re-measure the same way before moving any number here.
 *
 * ⚠ The value distribution is aspect-INDEPENDENT (every extent is a fraction),
 * so one table serves small, medium and large; only the composition differs.
 */
export const MeshTile = [
  { cx: 0.98, cy: 0.04, rx: 0.72, ry: 0.62, color: '#c8f25a', alpha: 0.16, fade: 0.72 },
  { cx: -0.02, cy: 0.46, rx: 0.7, ry: 0.76, color: '#105c4a', alpha: 0.6, fade: 0.8 },
  { cx: 1.0, cy: 1.02, rx: 0.78, ry: 0.68, color: '#1c546c', alpha: 0.5, fade: 0.8 },
] as const;

/**
 * The crown's vertical gradient (ADR 0087), lime to nothing. It ends in
 * TRANSPARENCY, never a hard edge — the fade is the hand-off to the mesh.
 * Shaped as `WashStop`s so translucency can only travel as `opacity` (trap 42).
 */
export const CrownGrad = [
  { offset: 0, color: '#c8f25a', opacity: 1 },
  { offset: 0.26, color: '#8ac768', opacity: 1 },
  { offset: 0.5, color: '#2f8f78', opacity: 1 },
  { offset: 0.68, color: '#176e60', opacity: 0.72 },
  { offset: 0.82, color: '#104842', opacity: 0.38 },
  { offset: 0.92, color: '#0a2828', opacity: 0.14 },
  { offset: 1, color: '#0f1316', opacity: 0 },
] as const;

/**
 * The crown gradient's FIXED height, in points (ADR 0094/0095) — the mock's
 * own number: its Clubs screen draws the gradient as a 432px layer behind
 * overflowing content, and every other screen now shares that geometry. The
 * layer is anchored to the top of the screen (plus the safe-area inset) and
 * does NOT size to the crown's content: a short crown lets the fade run on
 * behind the body, exactly as the mock's chips row sits on the Clubs fade.
 * This is what keeps the title on the same lime on every tab.
 */
export const CrownRamp = 432;

/** The white sheen over the crown's top-right shoulder (ADR 0087). */
export const CrownHighlight = {
  cx: 0.88, cy: 0.04, rx: 0.76, ry: 0.7, color: '#ffffff', alpha: 0.26, fade: 0.62,
} as const;

/** The bubble's inner vertical glass (ADR 0090) — white, opacity-only stops. */
export const BubbleGlass = [
  { offset: 0, color: '#ffffff', opacity: 0.34 },
  { offset: 0.46, color: '#ffffff', opacity: 0.1 },
  { offset: 1, color: '#ffffff', opacity: 0.2 },
] as const;

/**
 * The 0087 pair-wash geometry for the next/last cards (consumed from P2 by
 * `match-board`, replacing `ClubWash.seam`'s diagonal): near-horizontal at
 * 100°, each club's colour strongest at its own edge (`edge`), down to `mid`
 * by `midAt`, and dead-transparent through `gapStart`–`gapEnd` so the opaque
 * `card` base shows between the two colours.
 */
export const ClubWash2 = {
  angle: 100, edge: 0.24, mid: 0.05, midAt: 0.3, gapStart: 0.46, gapEnd: 0.54,
  /**
   * The WHISPER pair (ADR 0096): the same geometry on the liquid-glass NEXT UP
   * card, where the full alphas were the dark slab the glass replaced. On a
   * translucent shell the wash double-blends with whatever is behind it, so it
   * must stay at "tint", never "wash".
   */
  edgeOnGlass: 0.1, midOnGlass: 0.02,
} as const;

/** 4-point scale. Screen gutter is 20; cards pad 16–18; sheets pad 20. */
export const Spacing = {
  half: 2, one: 4, two: 8, three: 12, four: 16, five: 20, six: 24, seven: 32, eight: 44,
} as const;

export const Radius = {
  sheet: 28, card: 22, group: 20, tile: 18, control: 14, chip: 12, seg: 9, chipSm: 6, rail: 2, pill: 999,
  // The 0087 shell's additions. `tray`/`trayLg` are OUTER radii — a tray's
  // inner surface is always `outer − Size.trayPad`, so the two curves stay
  // concentric (ADR 0090/0091). `thumb` is the segmented thumb and the
  // ground league chip; `crownControl` is a control ON the crown (pager
  // square, crown chip); `cardLg` is the next/last card step-up.
  trayLg: 28, tray: 26, cardLg: 24, thumb: 13, crownControl: 11,
} as const;

/**
 * Type: system font (SF Pro) throughout — no expo-font, no licensing, and it
 * inherits Dynamic Type. Sizes are the iOS scale, not the web app's.
 * Every numeric run sets fontVariant: ['tabular-nums'].
 */
export const Type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  /**
   * The crown's title (ADR 0087): larger and LIGHTER than every other title —
   * weight 300 where the scale is 700 — because it sits on the lime band, not
   * beside content. Tracking is the mock's −0.04em of the size. `crownTitleLg`
   * is the Clubs screen's 48, whose subhead carries the follow count.
   */
  crownTitle: { fontSize: 40, fontWeight: '300', letterSpacing: -1.6 },
  crownTitleLg: { fontSize: 48, fontWeight: '300', letterSpacing: -1.9 },
  /** The club page hero's name (ADR 0091) — the crownless screens' large title. */
  heroTitle: { fontSize: 36, fontWeight: '700', letterSpacing: -1.5 },
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
  crestRow: 26, crestList: 30, crestCard: 40,
  /** The club hero's identity crest — 80, not the mock's 58: sized up on Ed's call (2026-09-01). */
  crestHero: 80,
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
  /** The crown's account disc — 42, up from 36 on Ed's call (ADR 0101). */
  tabIcon: 22, avatar: 42, sheetGrabber: 38,
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
   * The News screen's story-card thumbnail (ADR 0092) — a step above
   * `newsCardRow`, which stays the TODAY card's two follow-on rows. The two
   * are different surfaces: a doorway row inside another card, and a card of
   * its own on the mesh.
   */
  newsStoryThumb: 64,
  /** The Today card's LEAD thumbnail (ADR 0092) — the doorway's one big one. */
  newsCardLead: 96,
  /**
   * Player portraits. ⚠ The SOURCE aspect ratio varies by league — 256×278
   * (LaLiga), 110×140 (Premier League), and an operator stopgap has no
   * guaranteed size at all. These are the FRAME; the image is fitted inside
   * it, never stretched to it.
   */
  playerThumb: 34, playerPhotoW: 104, playerPhotoH: 116,
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
  /** The onboarding footer's primary button, and the crest discs inside it. */
  ctaH: 50, ctaDisc: 34, ctaDiscCrest: 24,
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

  /**
   * The 0087 shell (ADR 0087/0089/0090/0091).
   *
   * `glassBorder` is the glass card's hairline — 0.5, deliberately NOT
   * `StyleSheet.hairlineWidth` (0.33 disappears against the mesh the way the
   * score rule did in 0044). `trayPad` is the band between a tray's outer and
   * inner surfaces AND their radius difference — one number, two duties, so
   * the curves stay concentric. `leagueChipH` is the 0089 chip (below
   * `minTouch`; carries hitSlop like `eventTab`). The two bleeds are the club
   * page's decorative crests, drawn outside the box on purpose (ADR 0091).
   */
  glassBorder: 0.5,
  trayPad: 5,
  leagueChipH: 36,
  /**
   * The 0089 chip's mark box. Wider than tall because three of the four are
   * landscape lockups; LaLiga's 1:1 icon letterboxes inside it. The old fixed
   * TILE (`leagueTileW/H`, `leagueMarkW/H`) is superseded by 0089 and those
   * tokens await P6 cleanup.
   */
  leagueChipMarkW: 44,
  leagueChipMarkH: 22,
  bigCrestBleed: 238,
  oppCrestBleed: 146,
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
  /** One lap of the signed-out avatar's attention ring (ADR 0101). Tuned from 2800 — Ed wanted it calmer. */
  orbit: 4600,
} as const;

export const BottomTabInset = 80; // matches the designed bar height (ADR 0005 note)
export const MaxContentWidth = 520;

/**
 * The glass style tuples (ADR 0087), so the fill + hairline pair is written
 * once and cannot drift apart. Spread into a `StyleSheet.create` entry:
 * `card: { ...Surfaces.glass, borderRadius: Radius.card }`.
 */
export const Surfaces = {
  glass: {
    backgroundColor: dark.glassFill,
    borderWidth: Size.glassBorder,
    borderColor: dark.glassLine,
  },
  glassDim: { backgroundColor: dark.glassFillDim },
  trayOuter: { backgroundColor: dark.trayFill, borderWidth: 1, borderColor: dark.trayLine },
} as const;
