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

  /// theme.ts `cardYellow` / `cardRed`, and `onAccent` for the goal pentagon.
  ///
  /// ⚠ `cardRed` and theme.ts's `live` are the SAME hex and must not be aliased
  /// — a documented coincidence in `theme.ts`, and the two move independently.
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

  /// theme.ts `background` — the widget's own ground.
  ///
  /// ⚠ Widgets only. The notification card draws on the system's material and
  /// must never paint a ground of its own; a widget owns its whole rectangle and
  /// has to, or it inherits whatever the home screen is showing.
  static let ground = Color(red: 0.039, green: 0.043, blue: 0.047) // #0a0b0c

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
