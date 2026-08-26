import Foundation

/// What the card can know.
///
/// ⚠⚠ **`userInfo` is the ONLY input this extension has.** It cannot call the
/// API, read the app's store, or reach `copy.ts`. Anything the card draws has to
/// have been put on the payload before the notification was created — by
/// `applyReminders` for a local reminder, by `push-payload.mapper.ts` for a push.
/// A field missing here is a blank row on the card, not an error.
///
/// ⚠ Every field is optional on purpose. This parses payloads written by two
/// different codebases at two different times, including ones scheduled by an
/// older build of the app that is still sitting in the queue.
struct Payload {
  enum Kind: String {
    case reminder = "kickoff_reminder"
    case moved = "kickoff_moved"
    case postponed = "fixture_postponed"
  }

  let kind: Kind
  let fixtureId: String?
  let homeName: String
  let awayName: String
  let homeAbbr: String
  let awayAbbr: String
  let venue: String?
  let round: String?
  let kickoffUtc: Date?
  let oldKickoffUtc: Date?
  let newKickoffUtc: Date?
  /// Pre-formatted by the app in the reader's zone and clock preference.
  /// ⚠ Present on local reminders only — a server push has no idea what clock
  /// the reader chose, so the card formats from the instant instead.
  let kickoffLabel: String?
  /// How far before kickoff this reminder fires, in minutes.
  ///
  /// ⚠ **Defaulted to 30, never required.** Reminders scheduled by a pre-0040
  /// build are still sitting in iOS's queue with no such key, and they were all
  /// 30-minute ones — so the default is the correct reading of an old payload,
  /// not a fallback. ⚠ Meaningless on `.moved` and `.postponed`, which the
  /// server sends and which carry no lead at all.
  let leadMinutes: Int

  init?(_ info: [AnyHashable: Any]) {
    guard
      let raw = info["type"] as? String,
      let kind = Kind(rawValue: raw)
    else { return nil }

    self.kind = kind
    fixtureId = info["fixtureId"] as? String
    homeName = info["homeName"] as? String ?? ""
    awayName = info["awayName"] as? String ?? ""
    homeAbbr = info["homeAbbr"] as? String ?? ""
    awayAbbr = info["awayAbbr"] as? String ?? ""
    venue = (info["venue"] as? String).flatMap { $0.isEmpty ? nil : $0 }
    round = (info["round"] as? String).flatMap { $0.isEmpty ? nil : $0 }
    kickoffLabel = info["kickoffLabel"] as? String
    // ⚠ `as? Int` alone is not enough: JSON round-trips through
    // `NSNumber`/`Double` depending on how the payload was written, and a
    // `Double` bridged value fails an `Int` cast silently.
    leadMinutes = (info["leadMinutes"] as? NSNumber)?.intValue ?? 30
    kickoffUtc = Payload.instant(info["kickoffUtc"])
    oldKickoffUtc = Payload.instant(info["oldKickoffUtc"])
    newKickoffUtc = Payload.instant(info["newKickoffUtc"])
  }

  /// ⚠ The API emits both `…Z` and `…+00:00`, and `ISO8601DateFormatter` needs
  /// `.withFractionalSeconds` toggled to accept the ones carrying milliseconds.
  /// Trying one shape only silently loses every time on the card.
  private static func instant(_ raw: Any?) -> Date? {
    guard let text = raw as? String else { return nil }
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    if let date = plain.date(from: text) { return date }

    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return fractional.date(from: text)
  }

  /// The reader's local clock. ⚠ Never `Date()` arithmetic — a kickoff is an
  /// instant, and the card must show it in the zone the phone is set to.
  func time(_ date: Date?) -> String {
    guard let date else { return "—" }
    let formatter = DateFormatter()
    formatter.locale = .current
    formatter.timeZone = .current
    formatter.setLocalizedDateFormatFromTemplate("j:mm")
    return formatter.string(from: date)
  }

  /// `venue · matchday`, collapsing to whichever half exists.
  var context: String? {
    let parts = [venue, round].compactMap { $0 }
    return parts.isEmpty ? nil : parts.joined(separator: " · ")
  }
}
