import AppIntents

/// One followed club, as something the Edit Widget sheet can list.
///
/// ⚠⚠ **The query is OFFLINE and must stay offline.** `EntityQuery` is allowed to
/// be async and could in principle fetch, but the club list is already sitting in
/// the App Group snapshot and a network call here would stall the configuration
/// sheet on a phone in a stadium. Same rule as the crests (ADR 0025 step 4).
///
/// ⚠ **The picker is empty until the app has run once**, because the snapshot is
/// what fills it. That is correct rather than broken — a reader who has not
/// opened the app follows nothing to pick from — but it means the empty picker is
/// a real state a tester will hit, not a bug to chase.
struct ClubEntity: AppEntity {
  let id: String
  let name: String
  let abbr: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation { "Club" }

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)", subtitle: "\(abbr)")
  }

  static var defaultQuery: ClubQuery { ClubQuery() }
}

struct ClubQuery: EntityQuery {
  func entities(for identifiers: [ClubEntity.ID]) async throws -> [ClubEntity] {
    followed().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [ClubEntity] { followed() }

  private func followed() -> [ClubEntity] {
    (WidgetSnapshot.load()?.clubs ?? []).map {
      ClubEntity(id: $0.slug, name: $0.name, abbr: $0.abbr)
    }
  }
}

/// Long-press → Edit Widget → one club, or none.
///
/// ⚠ **`nil` means "every club I follow", and that is the DEFAULT** — not an
/// unset value waiting to be filled in. A widget dropped on the home screen has
/// to be useful before the reader has configured anything, and SPEC §4 describes
/// exactly that: the soonest match across the clubs you follow.
struct SelectClubIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "Club" }
  static var description: IntentDescription {
    IntentDescription("Show one club, or leave this empty for every club you follow.")
  }

  @Parameter(title: "Club")
  var club: ClubEntity?

  init() {}

  init(club: ClubEntity?) {
    self.club = club
  }
}

// MARK: - Standings (ADR 0185)

/// One league table, as something the STANDINGS widget's Edit sheet can list.
///
/// ⚠⚠ **OFFLINE, like `ClubQuery`, and for the same reason** — the tables are
/// already in the App Group (`widget/standings.json`), and a fetch here would
/// stall the configuration sheet on a phone in a stadium.
///
/// ⚠ **Empty until the app has run once**, because the snapshot fills it. The
/// unconfigured tile still draws the reader's league the moment it lands.
struct LeagueEntity: AppEntity {
  /// The ROUTE slug — `la-liga`, `champions-league`.
  let id: String
  let name: String

  static var typeDisplayRepresentation: TypeDisplayRepresentation { "League" }

  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }

  static var defaultQuery: LeagueQuery { LeagueQuery() }
}

struct LeagueQuery: EntityQuery {
  func entities(for identifiers: [LeagueEntity.ID]) async throws -> [LeagueEntity] {
    leagues().filter { identifiers.contains($0.id) }
  }

  func suggestedEntities() async throws -> [LeagueEntity] { leagues() }

  /// ⚠ In the snapshot's order, which is the Table tab's menu order — LaLiga,
  /// then the Champions League — so the sheet and the app list them alike.
  private func leagues() -> [LeagueEntity] {
    (StandingsSnapshot.load()?.tables ?? []).map { LeagueEntity(id: $0.slug, name: $0.name) }
  }
}

/// Long-press → Edit Widget → a league, or none.
///
/// ⚠ **`nil` means "the league I have picked in the app"**, and that is the
/// DEFAULT — a tile dropped on the home screen shows the table the reader was
/// last looking at, before they configure anything (`defaultSlug`).
struct SelectLeagueIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "League" }
  static var description: IntentDescription {
    IntentDescription("Pick a league, or leave this empty for the one you last opened in the app.")
  }

  @Parameter(title: "League")
  var league: LeagueEntity?

  init() {}

  init(league: LeagueEntity?) {
    self.league = league
  }
}
