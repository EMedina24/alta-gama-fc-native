import SwiftUI
import UIKit

/// The design tokens the extensions need.
///
/// ⚠⚠ **A SECOND SOURCE OF TRUTH, and there is no way around it.** An app
/// extension is a separate binary: it cannot import `@/constants/theme`, cannot
/// read the JS bundle, and cannot be handed values at runtime. Every number
/// below is a copy of one in `src/constants/theme.ts`, and a change there does
/// not reach here.
///
/// ⚠ **This file lives in `targets/_shared/`, so it compiles into EVERY target**
/// — the notification content extension, the widgets, and the app itself
/// (`@bacons/apple-targets` adds `targets/_shared/*` to all of them). That is
/// deliberate: one drifting copy was already the cost of the long-look card, and
/// a third for the widgets would have been worse. The consequence is that a
/// change here is a change to two extensions at once.
///
/// ⚠ Keep this list SHORT. The temptation is to mirror the whole theme "for
/// later"; every token copied here is another one that can silently drift. Only
/// what these surfaces actually draw belongs.
enum Tok {
  // Ink — theme.ts `text` and its opacity ramp.
  static let ink = Color.white
  static let ink90 = Color.white.opacity(0.90)
  static let ink78 = Color.white.opacity(0.78)
  static let ink62 = Color.white.opacity(0.62)
  static let ink60 = Color.white.opacity(0.60)
  static let ink58 = Color.white.opacity(0.58)
  static let ink55 = Color.white.opacity(0.55)
  static let ink50 = Color.white.opacity(0.50)
  static let ink45 = Color.white.opacity(0.45)
  static let ink42 = Color.white.opacity(0.42)
  static let ink34 = Color.white.opacity(0.34)
  static let ink32 = Color.white.opacity(0.32)

  // Alert types — theme.ts `accent`, `moved`, `postponed`.
  static let accent = Color(red: 0.784, green: 0.949, blue: 0.353) // #c8f25a
  /// theme.ts `accentWash` / `accentRing` — the HOME/AWAY pill on the medium
  /// widget (ADR 0059), the same pair `versus-badge.tsx` draws in the app.
  static let accentWash = Color(red: 0.784, green: 0.949, blue: 0.353).opacity(0.14)
  static let accentRing = Color(red: 0.784, green: 0.949, blue: 0.353).opacity(0.45)
  /// theme.ts `live` / `liveWash` — the widget ledger's in-play marker
  /// (ADR 0080). ⚠ The same hex as `cardYellow`'s sibling `cardRed` below, and
  /// that is a documented COINCIDENCE in theme.ts, not an alias: a liveness
  /// recolour must not repaint every red card, so the two stay separate names.
  static let live = Color(red: 1.000, green: 0.361, blue: 0.278) // #ff5c47
  static let liveWash = Color(red: 1.000, green: 0.361, blue: 0.278).opacity(0.14)

  static let moved = Color(red: 0.435, green: 0.788, blue: 1.000) // #6fc9ff
  static let postponed = Color(red: 1.000, green: 0.561, blue: 0.420) // #ff8f6b
  static let postponedWash = Color(red: 1.0, green: 0.561, blue: 0.420).opacity(0.14)
  static let postponedRing = Color(red: 1.0, green: 0.561, blue: 0.420).opacity(0.36)

  // Surfaces — theme.ts `raised`, `hairlineStrong`.
  static let tile = Color(red: 0.118, green: 0.129, blue: 0.149) // #1e2126
  static let hairline = Color.white.opacity(0.10)
  static let tileRing = Color.white.opacity(0.14)
  static let tileInk = Color(red: 0.561, green: 0.627, blue: 0.651) // #8fa0a6

  // ---------------------------------------- the live match alert (ADR 0053) --

  /// theme.ts `cardYellow` / `cardRed`, and the goal pentagon's ink.
  ///
  /// ⚠ `cardRed` and theme.ts's `live` are the SAME hex and must not be aliased
  /// — a documented coincidence in `theme.ts`, and the two move independently.
  ///
  /// ⚠⚠ **`onAccent` here is NOT theme.ts's `onAccent` (`#101806`), and that is
  /// deliberate — do not "fix" it.** theme.ts's is the ink of an on-lime
  /// CONTROL and is faintly olive. This one is the hole punched through the
  /// lime goal disc (`Glyphs.swift`), which has to read as the card's own dark
  /// ground showing through; the olive tint makes it read as a painted shape
  /// instead. It stayed at the old `#0a0b0c` when `ground` moved to `#0f1316`
  /// in ADR 0104, because the glyph is drawn on `activityGround` (`#07080a`)
  /// and on the notification card, never on the widget ground. HANDOFF trap 15.
  static let cardYellow = Color(red: 0.949, green: 0.757, blue: 0.306) // #f2c14e
  static let cardRed = Color(red: 1.000, green: 0.361, blue: 0.278) // #ff5c47
  static let onAccent = Color(red: 0.039, green: 0.043, blue: 0.047) // #0a0b0c

  /// The consequence text on the meta row — theme.ts has no name for this yet.
  static let redInk = Color(red: 1.000, green: 0.561, blue: 0.486) // #ff8f7c

  /// The attachment plate behind a live glyph: a wash and a hairline ring.
  ///
  /// ⚠ **UIColor, not Color, and that is not duplication for its own sake.** The
  /// service extension draws the plate with `UIGraphicsImageRenderer` — UIKit,
  /// because a notification ATTACHMENT is a PNG file on disk, not a view. The
  /// SwiftUI values above cannot be handed to a CoreGraphics context.
  static let plateAccentWash = UIColor(red: 0.784, green: 0.949, blue: 0.353, alpha: 0.13)
  static let plateAccentRing = UIColor(red: 0.784, green: 0.949, blue: 0.353, alpha: 0.30)
  static let plateAccent = UIColor(red: 0.784, green: 0.949, blue: 0.353, alpha: 1.0)
  static let plateOnAccent = UIColor(red: 0.039, green: 0.043, blue: 0.047, alpha: 1.0)
  static let plateRedWash = UIColor(red: 1.0, green: 0.361, blue: 0.278, alpha: 0.13)
  static let plateRedRing = UIColor(red: 1.0, green: 0.361, blue: 0.278, alpha: 0.30)
  static let plateRed = UIColor(red: 1.0, green: 0.361, blue: 0.278, alpha: 1.0)

  // ------------------------------------------ the app shell (ADR 0087/0104) --

  /// theme.ts `background` — the widget's own ground.
  ///
  /// ⚠⚠ **MOVED by ADR 0087** (`#0a0b0c → #0f1316`) and carried here by 0104.
  /// The app re-grounded to a lit OLED ground under the aurora mesh; the widgets
  /// were held back by 0087 §10 and drew the old flat black until 0104. If a
  /// tile ever looks a step darker than the app it opens, this is the value.
  ///
  /// ⚠ Widgets only. The notification card draws on the system's material and
  /// must never paint a ground of its own; a widget owns its whole rectangle and
  /// has to, or it inherits whatever the home screen is showing.
  static let ground = Color(red: 0.059, green: 0.075, blue: 0.086) // #0f1316

  /// theme.ts `glassFill` / `glassLine` / `glassFillDim` — the GLASS system
  /// (ADR 0087 §2), the pair `Surfaces.glass` spreads on every body card.
  ///
  /// ⚠ The line is 0.11 at **0.5pt**, deliberately not `hairlineWidth`: the app
  /// records that 0.33pt disappears against the mesh, and a widget is drawn at
  /// the same scale.
  ///
  /// ⚠ These are the FALLBACK. On iOS 26 `GlassSurface` draws the real
  /// `glassEffect(.clear)` instead and these are not used — see `Shell.swift`.
  static let glassFill = Color.white.opacity(0.06)
  static let glassLine = Color.white.opacity(0.11)
  static let glassFillDim = Color.white.opacity(0.05)

  /// theme.ts `recess` — what an expansion recesses INTO (ADR 0087 §4).
  ///
  /// ⚠ Translucent BLACK, so it recesses on any ground. The app's `sunken`
  /// charcoal was invisible against `#0f1316` and is why this token exists.
  static let recess = Color.black.opacity(0.28)

  /// theme.ts `plateTop` — the lit top edge every glass surface in the app
  /// carries (`live-plate.tsx`, `next-up-card.tsx`).
  ///
  /// ⚠ A top edge only, never a full border: on the widget's own rectangle a
  /// four-sided stroke would need a corner radius, and a second radius inside
  /// the system container mask double-rounds every edge (ADR 0085 §1).
  static let plateTop = Color.white.opacity(0.12)

  /// theme.ts `captionScrim`'s base — the dark a picture fades INTO.
  ///
  /// ⚠⚠ **Deliberately NOT `ground`, and this is the whole reason it exists.**
  /// The news lead's fade used to be drawn in `ground` back when `ground` was
  /// `#0a0b0c`. ADR 0104 moved `ground` to `#0f1316`, which would have quietly
  /// lightened every scrim in the target and cost the lead headline its
  /// contrast against a bright press photo. A scrim's job has nothing to do with
  /// the widget's ground; it is near-black because type has to survive on top
  /// of it.
  static let scrim = Color(red: 0.039, green: 0.043, blue: 0.047) // #0a0b0c

  /// One pool of the aurora mesh — theme.ts `Mesh`, transcribed field for field.
  ///
  /// ⚠ `rx` and `ry` are INDEPENDENT fractions of the surface, which is the
  /// whole reason this is a struct rather than three `EllipticalGradient`s with
  /// a single `endRadiusFraction`. See `MeshPlate` for how that is drawn.
  struct Pool {
    let cx: CGFloat
    let cy: CGFloat
    let rx: CGFloat
    let ry: CGFloat
    let color: Color
    let alpha: Double
    /// The location at which the pool reaches zero — the SVG stop's offset.
    let fade: CGFloat
  }

  /// theme.ts **`MeshTile`** — lime top-right, deep teal left, blue-teal
  /// bottom-right. Same three colours and the same three alphas as the app's
  /// `Mesh`; only the geometry differs.
  ///
  /// ⚠⚠ **Copying `Mesh` verbatim looks correct and renders DEAD, and 0104
  /// shipped that once before measuring it.** `Mesh` centres two of its three
  /// pools off the surface (`cx` −0.12 and 1.08). A ~930pt screen still catches
  /// their cores; a 158pt tile catches only their tails, so the tile came out a
  /// grey-green murk with all its colour trapped in the corners — under values
  /// that are right on a screen. `MeshTile` pulls the centres onto the tile's
  /// own edges and widens each fade. ⚠ The alphas are untouched: they were
  /// never what was wrong.
  ///
  /// ⚠ Calibrated against the real Today screen's body ground rather than
  /// judged by eye — see the token's note in `theme.ts` for the method and the
  /// numbers. Re-measure the same way before moving anything here.
  static let mesh: [Pool] = [
    Pool(cx: 0.98, cy: 0.04, rx: 0.72, ry: 0.62,
         color: accent, alpha: 0.16, fade: 0.72), // #c8f25a
    Pool(cx: -0.02, cy: 0.46, rx: 0.70, ry: 0.76,
         color: Color(red: 0.063, green: 0.361, blue: 0.290), alpha: 0.60, fade: 0.80), // #105c4a
    Pool(cx: 1.00, cy: 1.02, rx: 0.78, ry: 0.68,
         color: Color(red: 0.110, green: 0.329, blue: 0.424), alpha: 0.50, fade: 0.80), // #1c546c
  ]

  // ------------------------------------------ the broadcast card (ADR 0085) --

  /// theme.ts `activityGround` — the Live Activity's own base.
  ///
  /// ⚠ **A shade darker than `ground`** (`#07080a` against `#0a0b0c`), and not
  /// a rounding slip. The card is drawn over the reader's wallpaper rather than
  /// over the app, and the extra step is what keeps the floodlights above it
  /// reading as light rather than as a lighter grey.
  static let activityGround = Color(red: 0.027, green: 0.031, blue: 0.039) // #07080a

  /// theme.ts `activityPool` — the deep green pooling at the card's bottom edge.
  ///
  /// ⚠ **Its whole job is to keep the lime OFF the crests.** The two floodlight
  /// radials fall from the top corners onto exactly where the two badges sit; the
  /// pool is what stops a green cast landing on club artwork we do not own.
  static let activityPool = Color(red: 0.043, green: 0.157, blue: 0.125) // #0b2820

  /// The card's hairlines — the band rule and the column divider.
  ///
  /// ⚠ Fainter than `hairline` (0.09 against 0.10) because they are drawn at
  /// 0.5pt on a lit ground rather than 1pt on a flat one.
  static let activityHairline = Color.white.opacity(0.09)

  /// ⚠ **Tabular, always.** Every time on this card is a numeral in a fixed slot
  /// — a proportional `1` makes `19:00 → 21:00` jump as the digits change.
  static func numerals(_ size: CGFloat, _ weight: Font.Weight) -> Font {
    .system(size: size, weight: weight).monospacedDigit()
  }

  /// The type eyebrow and micro-labels: uppercase, heavily tracked.
  static func micro(_ size: CGFloat) -> Font {
    .system(size: size, weight: .bold)
  }
}

/// The corner radii — theme.ts `Radius`, the four these surfaces actually draw.
///
/// ⚠⚠ **None of these is the widget's OWN corner.** The system rounds a widget's
/// container and a Live Activity's card; drawing a second radius inside that mask
/// double-rounds every edge, which is the mistake ADR 0085 §1 caught on the
/// broadcast card and 0086 §3 refused on the medium tile. These are for surfaces
/// drawn INSIDE the tile — a glass slab, a story row, a chip.
///
/// ⚠ Same second-source-of-truth warning as `Tok`: a change in `theme.ts` does
/// not reach here.
enum Rad {
  /// theme.ts `Radius.card` — a body card.
  static let card: CGFloat = 22
  /// theme.ts `Radius.tile` — a slab inside a card.
  static let tile: CGFloat = 18
  /// theme.ts `Radius.thumb` — a news thumbnail and the row that holds it.
  static let thumb: CGFloat = 13
  /// theme.ts `Radius.chip` — a chip or tag.
  static let chip: CGFloat = 12
}
