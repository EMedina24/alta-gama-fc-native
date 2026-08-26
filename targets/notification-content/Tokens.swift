import SwiftUI

/// The design tokens the match card needs.
///
/// ⚠⚠ **A SECOND SOURCE OF TRUTH, and there is no way around it.** An app
/// extension is a separate binary: it cannot import `@/constants/theme`, cannot
/// read the JS bundle, and cannot be handed values at runtime. Every number
/// below is a copy of one in `src/constants/theme.ts`, and a change there does
/// not reach here.
///
/// ⚠ Keep this list SHORT. The temptation is to mirror the whole theme "for
/// later"; every token copied here is another one that can silently drift. Only
/// what this card actually draws belongs.
enum Tok {
  // Ink — theme.ts `text` and its opacity ramp.
  static let ink = Color.white
  static let ink78 = Color.white.opacity(0.78)
  static let ink62 = Color.white.opacity(0.62)
  static let ink60 = Color.white.opacity(0.60)
  static let ink55 = Color.white.opacity(0.55)
  static let ink50 = Color.white.opacity(0.50)
  static let ink45 = Color.white.opacity(0.45)
  static let ink42 = Color.white.opacity(0.42)

  // Alert types — theme.ts `accent`, `moved`, `postponed`.
  static let accent = Color(red: 0.784, green: 0.949, blue: 0.353) // #c8f25a
  static let moved = Color(red: 0.435, green: 0.788, blue: 1.000) // #6fc9ff
  static let postponed = Color(red: 1.000, green: 0.561, blue: 0.420) // #ff8f6b
  static let postponedWash = Color(red: 1.0, green: 0.561, blue: 0.420).opacity(0.14)
  static let postponedRing = Color(red: 1.0, green: 0.561, blue: 0.420).opacity(0.36)

  // Surfaces — theme.ts `raised`, `hairlineStrong`.
  static let tile = Color(red: 0.118, green: 0.129, blue: 0.149) // #1e2126
  static let hairline = Color.white.opacity(0.10)
  static let tileRing = Color.white.opacity(0.14)
  static let tileInk = Color(red: 0.561, green: 0.627, blue: 0.651) // #8fa0a6

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
