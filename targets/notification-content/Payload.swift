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
    // The live match alerts (ADR 0053).
    case goal = "match_goal"
    case redCard = "match_red_card"
    case fullTime = "match_full_time"
  }

  /// Which club a red card left short-handed, and by how many.
  ///
  /// ⚠ A TOKEN on the wire, not a sentence — the card turns it into words in
  /// the reader's language, which the server cannot do for a string it does not
  /// hold the translations for.
  enum Consequence: String {
    case homeTen = "home_ten_men"
    case awayTen = "away_ten_men"
    case homeNine = "home_nine_men"
    case awayNine = "away_nine_men"
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

  // ------------------------------------- the live meta row (ADR 0053) -----
  //
  // ⚠⚠ **These ARE the meta row.** `28' left · 🟨 3 · 🟥 1 · Getafe 10 men` has
  // no other source — a standard banner has no third styled row, so the meta
  // exists only on this card, and this card can only read `userInfo`.
  //
  // ⚠ Every one is optional and `nil` DROPS its segment. That is the design's
  // rule, not a tolerance: a zero would draw `🟨 0`, which is noise.

  /// Minute of the event. ⚠ Includes stoppage — `94` is 90+4.
  let minute: Int?
  /// ⚠ Server-sent. The device has no authority on stoppage time.
  let minutesLeft: Int?
  let homeScore: Int?
  let awayScore: Int?
  let yellowCards: Int?
  let redCards: Int?
  let consequence: Consequence?

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
    // ⚠ `NSNumber`, for the reason `leadMinutes` documents above: a JSON number
    // bridges as `Double` or `Int` depending on how it was written, and a plain
    // `as? Int` loses the Double case silently — a dropped meta segment with
    // nothing anywhere to say why.
    minute = (info["minute"] as? NSNumber)?.intValue
    minutesLeft = (info["minutesLeft"] as? NSNumber)?.intValue
    let score = info["score"] as? [AnyHashable: Any]
    homeScore = (score?["home"] as? NSNumber)?.intValue
    awayScore = (score?["away"] as? NSNumber)?.intValue
    let cards = info["cards"] as? [AnyHashable: Any]
    yellowCards = (cards?["yellow"] as? NSNumber)?.intValue
    redCards = (cards?["red"] as? NSNumber)?.intValue
    consequence = (info["consequence"] as? String).flatMap(Consequence.init)

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

  /// Whether this payload is one of the three live match alerts.
  var isLive: Bool {
    kind == .goal || kind == .redCard || kind == .fullTime
  }

  /// `2–1`, or nil before there is a score to show.
  ///
  /// ⚠ An EN DASH, matching every other scoreline in this product.
  var scoreline: String? {
    guard let homeScore, let awayScore else { return nil }
    return "\(homeScore)–\(awayScore)"
  }

  /// The club a red card left short-handed, by name, and whether it is nine.
  var shortHanded: (club: String, nine: Bool)? {
    switch consequence {
    case .homeTen: return (homeName, false)
    case .awayTen: return (awayName, false)
    case .homeNine: return (homeName, true)
    case .awayNine: return (awayName, true)
    case nil: return nil
    }
  }
}
