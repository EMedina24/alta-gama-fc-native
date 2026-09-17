import Foundation

/// What the STANDINGS widget can know (ADR 0185).
///
/// ⚠⚠ **A THIRD FILE IN THE APP GROUP**, `widget/standings.json`, written by
/// `src/features/standings/sync.ts` from `src/features/standings/snapshot.ts`
/// and read here; nothing else touches it. A field added to one side is a blank
/// on the tile until it is added to both.
///
/// ⚠⚠ **This file decides NOTHING.** Whether a table may be banded, which band a
/// rank falls in, where a hairline goes and which 20 of the Champions League's
/// 36 rows are shown were all decided in JS by the same functions the Table tab
/// runs. A second implementation here would be a tile that can disagree with the
/// screen it opens. Swift paints `band`, `ruleAbove` and `seamAbove` as given.
///
/// ⚠ The furniture (`copy`) is pre-localised in JS for the reason
/// `WidgetSnapshot.Copy` documents: a widget renders in the SYSTEM language,
/// and `.lproj` would hand an English tile to a reader who picked Spanish.
struct StandingsSnapshot: Codable {
  struct Copy: Codable {
    /// `TABLE` / `TABLA`.
    let title: String
    let pl: String
    let gd: String
    let pts: String
    /// No table for the chosen league yet.
    let empty: String
  }

  enum Band: String, Codable {
    // Domestic qualification — `League.zones`.
    case ucl, uel, conf, rel
    // The Champions League league phase — `Competition.bands`.
    case r16, playoff, out
  }

  struct Row: Codable, Identifiable {
    let rank: Int
    let teamSlug: String
    let name: String
    let abbr: String
    let played: Int
    /// Already signed — `+7`, `-3`, `0`.
    let goalDiff: String
    let points: Int
    let followed: Bool
    /// `standings-crests/{crestFile}`, nil → lettered tile.
    let crestFile: String?
    /// ⚠ A band this decoder does not know decodes as nil — see `init(from:)`.
    let band: Band?
    let ruleAbove: Bool
    let seamAbove: Bool

    var id: Int { rank }

    enum CodingKeys: String, CodingKey {
      case rank, teamSlug, name, abbr, played, goalDiff, points, followed
      case crestFile, band, ruleAbove, seamAbove
    }

    init(
      rank: Int, teamSlug: String, name: String, abbr: String, played: Int,
      goalDiff: String, points: Int, followed: Bool, crestFile: String?,
      band: Band?, ruleAbove: Bool, seamAbove: Bool
    ) {
      self.rank = rank
      self.teamSlug = teamSlug
      self.name = name
      self.abbr = abbr
      self.played = played
      self.goalDiff = goalDiff
      self.points = points
      self.followed = followed
      self.crestFile = crestFile
      self.band = band
      self.ruleAbove = ruleAbove
      self.seamAbove = seamAbove
    }

    /// ⚠ Lenient on `band` and the two rule flags ON PURPOSE. A band kind added
    /// in JS before this extension learns it must cost one row its rail — never
    /// the whole file, which would drop every table on the tile to its empty
    /// state (the decode is all-or-nothing).
    init(from decoder: Decoder) throws {
      let c = try decoder.container(keyedBy: CodingKeys.self)
      rank = try c.decode(Int.self, forKey: .rank)
      teamSlug = try c.decode(String.self, forKey: .teamSlug)
      name = try c.decode(String.self, forKey: .name)
      abbr = try c.decode(String.self, forKey: .abbr)
      played = try c.decode(Int.self, forKey: .played)
      goalDiff = try c.decode(String.self, forKey: .goalDiff)
      points = try c.decode(Int.self, forKey: .points)
      followed = (try? c.decode(Bool.self, forKey: .followed)) ?? false
      crestFile = try? c.decode(String.self, forKey: .crestFile)
      band = (try? c.decode(String.self, forKey: .band)).flatMap(Band.init(rawValue:))
      ruleAbove = (try? c.decode(Bool.self, forKey: .ruleAbove)) ?? false
      seamAbove = (try? c.decode(Bool.self, forKey: .seamAbove)) ?? false
    }
  }

  struct Table: Codable, Identifiable {
    /// The ROUTE slug — `la-liga`, `champions-league`. The intent entity's id.
    let slug: String
    /// The Edit sheet's label.
    let name: String
    /// `LALIGA · AFTER MD 4`, pre-formatted.
    let meta: String
    /// `altagamafc://table?league=…`.
    let url: URL
    let rows: [Row]

    var id: String { slug }
  }

  let v: Int
  let writtenAt: Date
  /// The league an unconfigured widget shows — the app's own pick.
  let defaultSlug: String?
  let copy: Copy
  let tables: [Table]

  static let appGroup = WidgetSnapshot.appGroup

  static func load() -> StandingsSnapshot? {
    guard
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: appGroup
      ),
      let data = try? Data(contentsOf: container.appendingPathComponent("widget/standings.json"))
    else { return nil }
    return decode(data)
  }

  /// ⚠ Split from `load()` so a render jig can feed it a snapshot the REAL JS
  /// builder wrote, without an App Group.
  static func decode(_ data: Data) -> StandingsSnapshot? {
    let decoder = JSONDecoder()
    // ⚠ `writtenAt` comes from `Date.toISOString()`, which carries
    // milliseconds — the fractional shape first, the plain one as a fallback
    // (the pair `Snapshot.swift` documents).
    decoder.dateDecodingStrategy = .custom { decoder in
      let text = try decoder.singleValueContainer().decode(String.self)
      let fractional = ISO8601DateFormatter()
      fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
      if let date = fractional.date(from: text) { return date }
      let plain = ISO8601DateFormatter()
      plain.formatOptions = [.withInternetDateTime]
      guard let date = plain.date(from: text) else {
        throw DecodingError.dataCorruptedError(
          in: try decoder.singleValueContainer(),
          debugDescription: "Not an ISO-8601 instant: \(text)"
        )
      }
      return date
    }
    return try? decoder.decode(StandingsSnapshot.self, from: data)
  }

  /// The table a widget configured with `slug` draws.
  ///
  /// ⚠ nil `slug` is the DEFAULT, not an unset value: an unconfigured tile shows
  /// the reader's own league from the app. A configured league that has left
  /// the snapshot (the cup table failed to load this time) falls back the same
  /// way rather than blanking a tile that has data to show.
  func table(for slug: String?) -> Table? {
    if let slug, let match = tables.first(where: { $0.slug == slug }) { return match }
    if let defaultSlug, let match = tables.first(where: { $0.slug == defaultSlug }) { return match }
    return tables.first
  }

  /// Before the app has ever run: the empty state, in English.
  static let unavailable = StandingsSnapshot(
    v: 1, writtenAt: .distantPast, defaultSlug: nil,
    copy: .init(title: "TABLE", pl: "PL", gd: "GD", pts: "PTS", empty: "Open the app to load the table"),
    tables: []
  )

  /// ⚠ The WIDGET GALLERY only (`context.isPreview`) — never a placed tile.
  /// The handoff's own illustrative LaLiga table, so the picker shows the
  /// layout rather than an empty state to someone who has not opened the app.
  static let placeholder: StandingsSnapshot = {
    let sample: [(String, String, Int, Int, Int, Bool, Band?)] = [
      ("Barcelona", "BAR", 4, 9, 12, true, .ucl), ("R. Madrid", "RMA", 4, 6, 10, false, .ucl),
      ("Villarreal", "VIL", 4, 3, 10, false, .ucl), ("Atlético", "ATM", 4, 4, 9, false, .ucl),
      ("Valencia", "VAL", 4, 4, 9, false, .ucl), ("Athletic", "ATH", 4, 2, 8, true, .uel),
      ("Betis", "BET", 4, 1, 7, false, .conf), ("Celta", "CEL", 4, 1, 6, false, nil),
      ("Sevilla", "SEV", 4, -1, 6, false, nil), ("Rayo", "RAY", 4, 0, 5, false, nil),
      ("Osasuna", "OSA", 4, -1, 5, false, nil), ("Getafe", "GET", 4, -1, 4, false, nil),
      ("Espanyol", "ESP", 4, -2, 4, false, nil), ("R. Sociedad", "RSO", 4, -2, 4, false, nil),
      ("Elche", "ELC", 4, -2, 3, false, nil), ("Alavés", "ALA", 4, -3, 3, false, nil),
      ("Deportivo", "DEP", 4, -3, 3, false, nil), ("Racing", "RAC", 4, -3, 2, false, .rel),
      ("Levante", "LEV", 4, -4, 2, true, .rel), ("Málaga", "MLG", 4, -8, 1, false, .rel),
    ]
    let rows = sample.enumerated().map { i, r in
      Row(
        rank: i + 1, teamSlug: r.1.lowercased(), name: r.0, abbr: r.1, played: r.2,
        goalDiff: r.3 > 0 ? "+\(r.3)" : "\(r.3)", points: r.4, followed: r.5,
        crestFile: nil, band: r.6, ruleAbove: i + 1 == 8 || i + 1 == 18, seamAbove: false
      )
    }
    return StandingsSnapshot(
      v: 1, writtenAt: .distantPast, defaultSlug: "la-liga",
      copy: .init(title: "TABLE", pl: "PL", gd: "GD", pts: "PTS", empty: "Open the app to load the table"),
      tables: [
        Table(
          slug: "la-liga", name: "LaLiga", meta: "LALIGA · AFTER MD 4",
          url: URL(string: "altagamafc://table?league=la-liga")!, rows: rows
        ),
      ]
    )
  }()
}
