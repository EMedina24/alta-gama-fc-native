import Foundation

/// The compact age label — `12m`, `3h`, `2d`.
///
/// ⚠⚠ **Derived at render time from the ENTRY's date, never pre-formatted in
/// JS.** This is the one field that inverts the rule the rest of the snapshot
/// follows. A baked "3h" is true for the minute it was written and a lie for
/// the next twelve hours; the provider emits hourly entries precisely so this
/// can be recomputed without a reload.
///
/// ⚠ Not `Text(date, style: .relative)` either — that renders "3 hr ago" and
/// localises into the SYSTEM language, which would put an English age next to a
/// Spanish clubCount. Digits plus one letter read the same in both.
extension W {
  static func age(from filed: Date, to now: Date) -> String {
    let seconds = max(0, now.timeIntervalSince(filed))
    if seconds < 3600 { return "\(Int(seconds / 60))m" }
    if seconds < 48 * 3600 { return "\(Int(seconds / 3600))h" }
    return "\(Int(seconds / 86_400))d"
  }
}
