import Foundation

/// The live sidecar — `<AppGroup>/widget/live.json` (ADR 0080).
///
/// ⚠⚠ **Three writers, one shape.** The app (`src/features/widgets/live.ts`,
/// while foreground), the widget extension (`targets/widget/Live.swift`, its
/// rationed poll), and the notification service extension (a goal / red card /
/// full-time push). The TS file is the mirror; a field added to one side is
/// invisible until it is in both.
///
/// ⚠ Lives in `targets/_shared/` because the notification SERVICE extension
/// writes it and the widget extension reads it — the same reason `Tokens.swift`
/// is here. That means it compiles into every target, including the app, which
/// never touches it.
///
/// ⚠ Decoding is forgiving on purpose, exactly like `Snapshot.swift`: this
/// parses a file written by a build (or a JS bundle) that may be older or newer
/// than this extension. A missing field is a quieter card, never a crash.
struct WidgetLiveState: Codable {
  struct Match: Codable {
    let fixtureId: String
    /// `live` | `halfTime` | `finished`. A string, not an enum with a decode
    /// failure in it — an unknown value renders as `live` with no minute.
    var status: String
    /// AS REPORTED, stoppage folded in (`94` = 90+4). Never 0, never ticked
    /// into this field — `minuteAt` is the anchor the display ticks from.
    var minute: Int?
    /// When `minute` was true. The display minute is `minute` plus whole
    /// minutes elapsed since — the Live Activity's synthetic-anchor idea
    /// (`MatchAttributes.clockFromEpoch`), kept as a pair because this file is
    /// ours to decode on both sides.
    var minuteAt: Date
    /// ⚠ Null means "no score yet", never nil–nil — render a dash.
    var homeGoals: Int?
    var awayGoals: Int?
    /// `Iglesias 20′`, already rendered. Null until the route serves events.
    var lastEvent: String?

    var isLive: Bool { status == "finished" ? false : true }

    /// The minute to PRINT at `date` — reported plus whole minutes elapsed
    /// since it was reported. Nil at the break, at full time, and before the
    /// first minute lands (never print `0′` — LIVE-SCORES.md §4).
    func displayMinute(at date: Date) -> Int? {
      guard status == "live", let minute else { return nil }
      let elapsed = Int(date.timeIntervalSince(minuteAt) / 60)
      return minute + max(0, elapsed)
    }
  }

  var v: Int
  var writtenAt: Date
  /// Who wrote last — `app` | `widget` | `push`. Diagnostic only.
  var source: String
  var matches: [Match]

  func match(for fixtureId: String) -> Match? {
    matches.first { $0.fixtureId == fixtureId }
  }

  /// Whether the LIVE rows have stopped being refreshed — the widget's version
  /// of the app's stalled state (ADR 0048/0049). The minute dims; the score
  /// stays. 10 minutes is `LIVE_MAX_AGE_MS`.
  func isStale(at date: Date) -> Bool {
    date.timeIntervalSince(writtenAt) > 10 * 60
  }
}

extension WidgetLiveState {
  /// ⚠ Matches `WidgetSnapshot.appGroup` and the literal in
  /// `NotificationService.swift` — restated here because `_shared` compiles
  /// into targets that have neither.
  static let appGroup = "group.com.altagamafc.app"

  static func fileURL() -> URL? {
    FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
      .appendingPathComponent("widget/live.json")
  }

  /// ⚠ The same both-shapes ISO 8601 dance as `Snapshot.swift`: JS writes
  /// milliseconds, Swift's plain formatter refuses them, and trying one shape
  /// only loses every time.
  static func decoder() -> JSONDecoder {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .custom { decoder in
      let text = try decoder.singleValueContainer().decode(String.self)
      let plain = ISO8601DateFormatter()
      plain.formatOptions = [.withInternetDateTime]
      if let date = plain.date(from: text) { return date }

      let fractional = ISO8601DateFormatter()
      fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      if let date = fractional.date(from: text) { return date }

      throw DecodingError.dataCorrupted(DecodingError.Context(
        codingPath: decoder.codingPath,
        debugDescription: "Unrecognised date: \(text)"
      ))
    }
    return decoder
  }

  static func load() -> WidgetLiveState? {
    guard
      let url = fileURL(),
      let data = try? Data(contentsOf: url)
    else { return nil }
    return try? decoder().decode(WidgetLiveState.self, from: data)
  }

  /// ⚠ `.atomic` — Foundation's temp-then-rename, the same guarantee
  /// `writeGroupJson` gives from JS. A reader never sees a half-written file.
  @discardableResult
  func save() -> Bool {
    guard let url = WidgetLiveState.fileURL() else { return false }
    let directory = url.deletingLastPathComponent()
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .custom { date, encoder in
      let formatter = ISO8601DateFormatter()
      formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      var container = encoder.singleValueContainer()
      try container.encode(formatter.string(from: date))
    }

    guard let data = try? encoder.encode(self) else { return false }
    do {
      try data.write(to: url, options: .atomic)
      return true
    } catch {
      return false
    }
  }

  /// A push landed — merge one match's new truth and persist (ADR 0080).
  ///
  /// Called by the notification SERVICE extension, which sees every goal, red
  /// card and full-time push before iOS displays it. ⚠ Merge, never replace:
  /// two matches can be in play at once, and a goal in one must not erase the
  /// other's score.
  static func applyPush(
    fixtureId: String,
    minute: Int?,
    homeGoals: Int?,
    awayGoals: Int?,
    finished: Bool,
    now: Date = Date()
  ) {
    var state = load() ?? WidgetLiveState(v: 1, writtenAt: now, source: "push", matches: [])

    var match = state.match(for: fixtureId) ?? Match(
      fixtureId: fixtureId,
      status: "live",
      minute: nil,
      minuteAt: now,
      homeGoals: nil,
      awayGoals: nil,
      lastEvent: nil
    )
    match.status = finished ? "finished" : "live"
    // ⚠ A payload without a score must not blank one a poll already wrote.
    if let homeGoals { match.homeGoals = homeGoals }
    if let awayGoals { match.awayGoals = awayGoals }
    if finished {
      match.minute = nil
    } else if let minute {
      match.minute = minute
      match.minuteAt = now
    }

    state.matches.removeAll { $0.fixtureId == fixtureId }
    state.matches.append(match)
    state.writtenAt = now
    state.source = "push"
    state.save()
  }
}
