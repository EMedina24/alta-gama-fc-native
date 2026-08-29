import Foundation

/// What the NEWS widget can know.
///
/// ⚠⚠ **A SECOND FILE IN THE APP GROUP, not a bigger `snapshot.json`.** Fixtures
/// and headlines refresh on completely different clocks — fixtures when a round
/// is published, headlines every few minutes — and one file means the writer has
/// to hold both in memory to update either. `widget/news.json` is written by
/// `src/features/news/snapshot.ts` and read here; nothing else touches it.
///
/// ⚠⚠ **The headline is a QUOTE.** It arrives already in the publisher's
/// language and is never translated, shortened, or re-cased — the feed is
/// aggregated third-party reporting that links out, and editing it here would
/// misattribute words to MARCA / SPORT / ESPN that they did not write. Only the
/// furniture (`copy`) follows the reader's locale, and it is pre-formatted in
/// JS for the same reason `WidgetSnapshot.Copy` is: a widget renders in the
/// SYSTEM language, so `.lproj` would hand an English tile to a reader who
/// picked Spanish in the app.
struct NewsSnapshot: Codable {
  struct Copy: Codable {
    /// `NEWS` / `NOTICIAS`.
    let news: String
    /// Fully formed — `5 CLUBS` / `5 CLUBES`. Plural resolved in JS.
    let clubCount: String
    /// Follows clubs, feed is empty.
    let noHeadlines: String
    /// Follows nothing at all — a different situation with a different fix.
    let followPrompt: String
  }

  struct Item: Codable, Identifiable {
    let id: String
    /// Club or competition. ⚠ **Optional in the feed** — every SPORT item files
    /// under none. A missing topic draws NO chip; it must never become a dash,
    /// which reads as a value that failed to load.
    let topic: String?
    let publisher: String
    let title: String
    /// When the publisher filed it. ⚠ The AGE is derived from this against the
    /// timeline entry's own date, never pre-formatted — see `W.age`.
    let filedAt: Date
    /// Opens at the publisher. The aggregation links out; it does not host.
    let url: URL
    /// `news/{id}.jpg` in the App Group, or nil when the image never cached.
    let hasImage: Bool
  }

  let v: Int
  let writtenAt: Date
  let copy: Copy
  let items: [Item]

  static let appGroup = WidgetSnapshot.appGroup

  static func load() -> NewsSnapshot? {
    guard
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: appGroup
      ),
      let data = try? Data(contentsOf: container.appendingPathComponent("widget/news.json"))
    else { return nil }

    let decoder = JSONDecoder()
    // ⚠ Same two ISO-8601 shapes `Snapshot.swift` documents — the API emits
    // both, and the plain formatter rejects the ones carrying milliseconds.
    decoder.dateDecodingStrategy = .custom { decoder in
      let text = try decoder.singleValueContainer().decode(String.self)
      let plain = ISO8601DateFormatter()
      plain.formatOptions = [.withInternetDateTime]
      if let date = plain.date(from: text) { return date }
      let fractional = ISO8601DateFormatter()
      fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      guard let date = fractional.date(from: text) else {
        throw DecodingError.dataCorruptedError(
          in: try decoder.singleValueContainer(),
          debugDescription: "Not an ISO-8601 instant: \(text)"
        )
      }
      return date
    }
    return try? decoder.decode(NewsSnapshot.self, from: data)
  }

  /// ⚠ No `placeholder` twin here, and that is deliberate: fabricated headlines
  /// are worse than fabricated fixtures. A sample tile would put invented
  /// quotes under a real publisher's name. The gallery preview gets the empty
  /// state, which is honest and still shows the layout.
  static func unavailable(relativeTo now: Date) -> NewsSnapshot {
    NewsSnapshot(
      v: 1, writtenAt: now,
      copy: .init(news: "NEWS", clubCount: "", noHeadlines: "No headlines yet", followPrompt: "Open Alta Gama FC"),
      items: []
    )
  }

  /// Freshest first, and nothing older than two days — a Home Screen tile
  /// showing Tuesday's transfer rumour on Friday is worse than showing three
  /// stories instead of four.
  func fresh(at date: Date, limit: Int = 4) -> [Item] {
    items
      .filter { date.timeIntervalSince($0.filedAt) < 48 * 3600 }
      .sorted { $0.filedAt > $1.filedAt }
      .prefix(limit)
      .map { $0 }
  }
}
