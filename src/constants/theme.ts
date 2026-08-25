/**
 * AltaGama FC — native design tokens.
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

  // Brand + status
  accent: '#c8f25a',            // the ONE carry-over from the web app
  onAccent: '#101806',
  accentWash: 'rgba(200,242,90,0.14)',
  accentRing: 'rgba(200,242,90,0.45)',
  live: '#ff5c47',              // in-progress marker, destructive
  liveWash: 'rgba(255,92,71,0.14)',
  danger: '#ff5c47',

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
  /** Scores, kickoff times, countdowns. */
  scoreLarge: { fontSize: 38, fontWeight: '700', letterSpacing: -1.5 },
  kickoff: { fontSize: 40, fontWeight: '700', letterSpacing: -1.4 },
  numeral: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
} as const;

/** Hit targets: nothing interactive below 44. Switch is 51×31 (system). */
export const Size = {
  minTouch: 44, switchW: 51, switchH: 31, switchKnob: 27,
  crestRow: 26, crestList: 30, crestCard: 40, crestHero: 58,
  tabIcon: 22, avatar: 36, sheetGrabber: 38,
} as const;

export const BottomTabInset = 80; // matches the designed bar height (ADR 0005 note)
export const MaxContentWidth = 520;
