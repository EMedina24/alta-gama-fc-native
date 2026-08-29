import Foundation

/// What the widgets can know.
///
/// ⚠⚠ **`widget/snapshot.json` in the App Group is the ONLY input.** A widget
/// extension is a separate process: it cannot call the API, read AsyncStorage,
/// reach the TanStack Query cache (which is not persisted to disk), or import
/// `@/constants/theme` or `@/lib/i18n`. Anything drawn here was put in the
/// container by `src/features/widgets/snapshot.ts` before this ran.
///
/// ⚠⚠ **Every string the widget PRINTS is pre-formatted by JS, including the
/// furniture.** That inverts what the notification content extension does with
/// its two `.lproj` files, and the inversion is the point: a widget renders in
/// the SYSTEM language, so `.lproj` strings would hand an English widget to a
/// reader who picked Spanish inside the app. The snapshot travels with the
/// reader's `lang`, `tz` and `clock` already applied. The only hardcoded English
/// in this target is `placeholder`, for the gallery preview before the app has
/// ever run.
///
/// ⚠ Decoding is forgiving on purpose — this parses a file written by a build of
/// the app that may be older than this extension. A missing field is a quieter
/// widget, never a crash.
struct WidgetSnapshot: Codable {
  struct Club: Codable, Hashable {
    let slug: String
    let name: String
    let abbr: String
  }

  /// The card's own furniture. See the type header for why this is not `.lproj`.
  struct Copy: Codable {
    let next: String
    let yourWeek: String
    /// ⚠ Fully formed — `3 CLUBS` / `3 CLUBES`. The plural is resolved in JS, so
    /// this target holds no counting rule for any language.
    let clubCount: String
    let followPrompt: String
    let noFixtures: String
    /// The separator in `VAL v RMA`. Localised — `v` in English, `vs` in Spanish.
    let versus: String
    /// Prefix for an away row: `at Girona` / `en Girona`.
    let away: String
    /// The pill after the followed side on the medium widget: `HOME` / `CASA`
    /// (ADR 0059). ⚠ Optional — absent from a v1 snapshot, and a missing pill
    /// is the honest degradation.
    let homeTag: String?
    let awayTag: String?
  }

  struct Entry: Codable, Identifiable {
    let fixtureId: String
    /// The FOLLOWED club this row belongs to — not necessarily the home side.
    let clubSlug: String
    let isHome: Bool
    let homeAbbr: String
    let awayAbbr: String
    /// Both sides named, home first (ADR 0059). ⚠ Optional: a v1 snapshot
    /// written by an older app has neither, and the row falls back to the abbrs.
    let homeName: String?
    let awayName: String?
    let opponentName: String
    let opponentAbbr: String
    /// Which crest file in the App Group is the opponent's: `home` or `away`.
    let opponentSlot: String
    let kickoffUtc: Date
    /// Pre-formatted in the reader's zone and clock preference. `Sat 21:00`.
    let kickoffLabel: String
    /// `SAT` over `21:00` — the medium widget's stacked column (ADR 0059).
    /// ⚠ Optional for the same reason as `homeName`; the row falls back to
    /// `kickoffLabel` on one line.
    let kickoffDay: String?
    let kickoffTime: String?
    /// `J4`. Null for a competition without rounds.
    let roundLabel: String?
    let venue: String?

    var id: String { fixtureId }
  }

  let v: Int
  let writtenAt: Date
  let clubs: [Club]
  let copy: Copy
  let entries: [Entry]
}

extension WidgetSnapshot {
  /// ⚠ Matches `ios.entitlements` in `app.json`, every `expo-target.config.js`,
  /// and `APP_GROUP` in `src/features/push/crest-cache.ts`.
  static let appGroup = "group.com.altagamafc.app"

  static func load() -> WidgetSnapshot? {
    guard
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: appGroup
      ),
      let data = try? Data(contentsOf: container.appendingPathComponent("widget/snapshot.json"))
    else { return nil }

    let decoder = JSONDecoder()
    // ⚠ The API emits both `…Z` and `…+00:00`, and only the fractional-seconds
    // formatter accepts the ones carrying milliseconds. Trying one shape only
    // loses every time — the same trap `Payload.swift` documents.
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

    return try? decoder.decode(WidgetSnapshot.self, from: data)
  }

  /// Rows still ahead of `date`, optionally narrowed to one club.
  ///
  /// ⚠ The filter on `kickoffUtc > date` is what makes a snapshot the app has
  /// not refreshed degrade to the empty state rather than to a countdown that
  /// has gone negative. A widget on a phone that has not opened the app in a
  /// week must say "nothing scheduled", not lie about a match played on Sunday.
  func rows(after date: Date, clubSlug: String?) -> [Entry] {
    entries
      .filter { $0.kickoffUtc > date }
      .filter { clubSlug == nil || $0.clubSlug == clubSlug }
      .sorted { $0.kickoffUtc < $1.kickoffUtc }
  }

  /// Whether the reader follows anything at all — which is a different empty
  /// state from "follows clubs, none of them are playing".
  var followsNothing: Bool { clubs.isEmpty }
}

extension WidgetSnapshot {
  /// ⚠ The only hardcoded copy in this target, and English-only by necessity —
  /// before the app has run there is no reader preference to read. Kept to the
  /// widget's furniture.
  static let fallbackCopy = Copy(
    next: "NEXT",
    yourWeek: "YOUR WEEK",
    clubCount: "",
    followPrompt: "Open Alta Gama FC",
    noFixtures: "No matches scheduled",
    versus: "v",
    away: "at",
    homeTag: "HOME",
    awayTag: "AWAY"
  )

  /// No snapshot on disk at all — the app has never run, or the App Group is not
  /// provisioned.
  ///
  /// ⚠⚠ **This is NOT `placeholder`, and the difference is the whole point.** A
  /// widget placed on a real home screen before the app's first launch used to
  /// fall through to the gallery sample and draw `VAL v RMA · Mestalla` — three
  /// fabricated fixtures for clubs the reader may not follow, in a country they
  /// may not live in, presented exactly like real data. The sample belongs in
  /// the picker, where everything is obviously a preview, and nowhere else.
  static func unavailable(relativeTo now: Date) -> WidgetSnapshot {
    WidgetSnapshot(v: 2, writtenAt: now, clubs: [], copy: fallbackCopy, entries: [])
  }

  /// The gallery preview.
  ///
  /// ⚠ For `context.isPreview` only — see `unavailable` for why. A real but empty
  /// snapshot would make every tile in the widget picker say "Follow a club",
  /// which reads as broken to someone who simply has not opened the app yet.
  static func placeholder(relativeTo now: Date) -> WidgetSnapshot {
    WidgetSnapshot(
      v: 2,
      writtenAt: now,
      clubs: [
        .init(slug: "valencia", name: "Valencia CF", abbr: "VAL"),
        .init(slug: "sevilla", name: "Sevilla FC", abbr: "SEV"),
        .init(slug: "athletic", name: "Athletic Club", abbr: "ATH"),
      ],
      copy: .init(
        next: "NEXT",
        yourWeek: "YOUR WEEK",
        clubCount: "3 CLUBS",
        followPrompt: "Follow a club",
        noFixtures: "No fixtures scheduled",
        versus: "v",
        away: "at",
        homeTag: "HOME",
        awayTag: "AWAY"
      ),
      entries: [
        .init(
          fixtureId: "preview-1", clubSlug: "valencia", isHome: true,
          homeAbbr: "VAL", awayAbbr: "RMA",
          homeName: "Valencia", awayName: "R. Madrid",
          opponentName: "Real Madrid", opponentAbbr: "RMA", opponentSlot: "away",
          kickoffUtc: now.addingTimeInterval(100_800),
          kickoffLabel: "Sat 21:00", kickoffDay: "SAT", kickoffTime: "21:00",
          roundLabel: "J4", venue: "Mestalla"
        ),
        .init(
          fixtureId: "preview-2", clubSlug: "sevilla", isHome: true,
          homeAbbr: "SEV", awayAbbr: "OSA",
          homeName: "Sevilla", awayName: "Osasuna",
          opponentName: "Osasuna", opponentAbbr: "OSA", opponentSlot: "away",
          kickoffUtc: now.addingTimeInterval(169_200),
          kickoffLabel: "Sun 16:15", kickoffDay: "SUN", kickoffTime: "16:15",
          roundLabel: "J4", venue: "Sánchez-Pizjuán"
        ),
        .init(
          fixtureId: "preview-3", clubSlug: "athletic", isHome: false,
          homeAbbr: "GIR", awayAbbr: "ATH",
          homeName: "Girona", awayName: "Athletic",
          opponentName: "Girona", opponentAbbr: "GIR", opponentSlot: "home",
          kickoffUtc: now.addingTimeInterval(177_300),
          kickoffLabel: "Sun 18:30", kickoffDay: "SUN", kickoffTime: "18:30",
          roundLabel: "J4", venue: "Montilivi"
        ),
      ]
    )
  }
}
