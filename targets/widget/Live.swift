import Foundation

/// The widget's own poll of `GET /cronogol/live` (ADR 0080).
///
/// ⚠⚠ **This is the ONE sanctioned network call in this target, and it is
/// rationed.** ADR 0025 step 4's "no network in a timeline provider" was about
/// crest artwork and stands for everything else; 0080 carves out exactly this
/// route, exactly inside a match window — some snapshot row kicked off within
/// the last 150 minutes. Outside the window `FixtureProvider` never calls this,
/// so a widget with nothing in play spends nothing.
///
/// ⚠ The reload cadence while live is 5 minutes (`Cadence.liveReload`): ~30
/// reloads across a match with stoppage, against WidgetKit's ~40–70/day budget.
/// The minute STILL moves every minute — per-minute timeline ENTRIES are free
/// (ADR 0047 "entries are free, reloads are rationed") and tick the anchor in
/// `WidgetLiveState.Match.displayMinute(at:)` on-device. Goal pushes reload on
/// top, through the notification service extension.
enum LiveFetch {
  /// The wire shape — only what the ledger draws. `LiveMatchView` in
  /// `src/lib/cronogol/types.ts` is the full contract; unknown fields are
  /// ignored by `JSONDecoder`, which is the forward-compatibility here.
  struct RouteMatch: Decodable {
    struct Score: Decodable {
      let home: Int?
      let away: Int?
    }
    struct Event: Decodable {
      struct Person: Decodable { let name: String }
      let type: String?
      let minute: Int?
      let player: Person?
    }
    let fixtureId: String
    let status: String
    /// ⚠ Null unless live; includes stoppage (`94` = 90+4). Never render `0′`.
    let minute: Int?
    let score: Score
    /// ⚠ `[]` does not distinguish "nothing happened" from "not fetched yet"
    /// (LIVE-SCORES.md §2) — the scorer line is a bonus, never load-bearing.
    /// Optional: the field predates its own deployment (backend §98).
    let events: [Event]?
  }

  private struct Response: Decodable {
    let matches: [RouteMatch]
  }

  /// ⚠ `?league=laliga` — the API slug, never our `la-liga` (the same trap
  /// `queries/keys.ts` documents). Any OTHER parameter is a 400.
  private static let url = URL(string: "https://crono-gol.com/cronogol/live?league=laliga")!

  /// Nil on any failure — offline, timeout, non-200, undecodable. The caller
  /// keeps whatever `live.json` already holds; a failed poll must never blank
  /// a score that was true five minutes ago.
  static func fetch() async -> [RouteMatch]? {
    var request = URLRequest(url: url)
    // ⚠ Short. A timeline provider has seconds, not the app's patience — a
    // hung request here delays every widget on the home screen.
    request.timeoutInterval = 4

    guard
      let (data, response) = try? await URLSession.shared.data(for: request),
      let http = response as? HTTPURLResponse,
      (200..<300).contains(http.statusCode),
      let decoded = try? JSONDecoder().decode(Response.self, from: data)
    else { return nil }

    return decoded.matches
  }
}

enum LiveMerge {
  /// Fold a fresh poll into the persisted state.
  ///
  /// The rules, in order, per snapshot row that is in the in-play window:
  /// - **Route serves it live** → `live`, minute re-anchored — except the
  ///   half-time reads: a minute frozen at 45 across two polls, or a null
  ///   minute long after kickoff, both mean the break (`halfTime`). The route
  ///   has no break state to give us (LIVE-SCORES.md), so this is a heuristic
  ///   and recorded as one in ADR 0080.
  /// - **Route no longer serves a row we HAVE seen live** → `finished`, last
  ///   score kept. Rows vanish at the whistle; the vanishing IS full time.
  /// - **Route has never served it** → nothing. The ledger draws the
  ///   kicked-off dashes from the snapshot row alone (ADR 0078's tier, on the
  ///   widget), and fabricating a state row for it would turn "no data yet"
  ///   into "finished" on the next merge.
  static func merge(
    previous: WidgetLiveState?,
    route: [LiveFetch.RouteMatch],
    inPlay: [WidgetSnapshot.Entry],
    now: Date
  ) -> WidgetLiveState {
    let served = Dictionary(uniqueKeysWithValues: route.map { ($0.fixtureId, $0) })
    var matches: [WidgetLiveState.Match] = []

    for row in inPlay {
      let old = previous?.match(for: row.fixtureId)

      // ⚠ The `_debug/widgets` sample writer's escape hatch: a fabricated
      // `debug-` fixture is not on the route, and without this the merge
      // (correctly) declares it finished on the very first poll — which is how
      // the FT path got verified, and also why the LIVE preview needs the
      // guard. Real fixture ids are UUIDs; nothing else collides.
      if row.fixtureId.hasPrefix("debug-") {
        if let old { matches.append(old) }
        continue
      }

      if let fresh = served[row.fixtureId], fresh.status == "live" {
        let minute = fresh.minute == 0 ? nil : fresh.minute
        let sinceKickoff = now.timeIntervalSince(row.kickoffUtc)

        // The break, read two ways — see the header.
        let frozenAt45 = minute == 45 && old?.status != "finished" && old?.minute == 45
          && (old.map { now.timeIntervalSince($0.minuteAt) > 3 * 60 } ?? false)
        let nullAfterAnHour = minute == nil && sinceKickoff > 50 * 60

        let lastGoal = (fresh.events ?? []).last { $0.type == "goal" }
        let lastEvent = lastGoal.flatMap { event -> String? in
          guard let name = event.player?.name, let at = event.minute else { return nil }
          return "\(name) \(at)′"
        }

        matches.append(WidgetLiveState.Match(
          fixtureId: row.fixtureId,
          status: (frozenAt45 || nullAfterAnHour) ? "halfTime" : "live",
          minute: minute,
          // ⚠ Keep the OLD anchor when the reported minute has not moved —
          // re-anchoring an unchanged 45 every poll is what would make the
          // frozen-minute read above never fire.
          minuteAt: (old?.minute == minute ? old?.minuteAt : nil) ?? now,
          homeGoals: fresh.score.home,
          awayGoals: fresh.score.away,
          lastEvent: lastEvent ?? old?.lastEvent
        ))
        continue
      }

      if var old, old.isLive {
        // Seen live, now gone: full time. The score is the last one served.
        old.status = "finished"
        old.minute = nil
        matches.append(old)
        continue
      }

      if let old { matches.append(old) } // Already finished — hold it.
    }

    return WidgetLiveState(v: 1, writtenAt: now, source: "widget", matches: matches)
  }
}
