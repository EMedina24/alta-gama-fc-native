import WidgetKit

/// One rendered instant: the rows still ahead at `date`, and the live ledger.
struct FixtureEntry: TimelineEntry {
  /// One in-play row: the snapshot fixture plus whatever `live.json` knows.
  ///
  /// ⚠ `match` nil is the KICKED-OFF state (ADR 0078, on the widget): the
  /// kickoff passed but `/cronogol/live` has not served the row yet — the
  /// ledger draws dashes, never `0 – 0`.
  struct LivePair: Identifiable {
    let row: WidgetSnapshot.Entry
    let match: WidgetLiveState.Match?
    var id: String { row.fixtureId }
  }

  let date: Date
  let copy: WidgetSnapshot.Copy
  let rows: [WidgetSnapshot.Entry]
  /// Matches in play (or finished today), earliest kickoff first (ADR 0080).
  let live: [LivePair]
  /// The live data has stopped refreshing — dim the minute, keep the score
  /// (the app's stalled rule, ADR 0048/0049).
  let liveStale: Bool
  /// True when the reader follows nothing at all — a different empty state from
  /// "follows clubs, none of them are playing in the window".
  let followsNothing: Bool
}

/// The shared provider behind both widgets.
///
/// ⚠ Reads the App Group — plus ONE rationed network call (ADR 0080): while a
/// snapshot row is inside its match window, `/cronogol/live` is polled on each
/// 5-minute reload so the ledger has a score with the app closed. That is the
/// single carve-out from ADR 0025 step 4's no-network rule; crests and
/// everything else still arrive only through the container, written by
/// `src/features/widgets/snapshot.ts` on the app's last foreground.
///
/// ⚠⚠ **The poll is gated on the FAMILY, because only one of the two widgets
/// draws a ledger now** (ADR 0086). YOUR WEEK is `.systemMedium` and nothing
/// else; NEXT is `.systemSmall` plus the three accessories — so the family
/// identifies the widget without a second provider. A medium tile left alone on
/// a home screen must not spend the 5-minute reload cadence on a score it does
/// not print: that budget is ~40-70 reloads a day and overspending it freezes
/// every widget for the rest of the day with nothing in any log (trap 34).
struct FixtureProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> FixtureEntry {
    entry(at: Date(), snapshot: WidgetSnapshot.placeholder(relativeTo: Date()), club: nil)
  }

  /// ⚠ `context.isPreview` is true while the reader is scrolling the widget
  /// picker, where a real but EMPTY snapshot would show "Follow a club" on every
  /// tile and make the widget look broken to someone who has simply not opened
  /// the app yet. The sample belongs there — and, per `WidgetSnapshot.unavailable`,
  /// ONLY there.
  func snapshot(for configuration: SelectClubIntent, in context: Context) async -> FixtureEntry {
    let now = Date()
    let source = context.isPreview
      ? WidgetSnapshot.placeholder(relativeTo: now)
      : (WidgetSnapshot.load() ?? .unavailable(relativeTo: now))
    return entry(at: now, snapshot: source, club: configuration.club?.id)
  }

  func timeline(
    for configuration: SelectClubIntent,
    in context: Context
  ) async -> Timeline<FixtureEntry> {
    let now = Date()
    // ⚠ `.unavailable`, NOT `.placeholder`. A widget on a real home screen must
    // never draw the gallery sample — see `WidgetSnapshot.unavailable`.
    let snapshot = WidgetSnapshot.load() ?? .unavailable(relativeTo: now)
    // See the type header: `.systemMedium` is YOUR WEEK, which stopped drawing
    // the ledger in ADR 0086 and must stop paying for it too.
    let drawsLive = context.family != .systemMedium
    let club = configuration.club?.id
    let kickoffs = snapshot.rows(after: now, clubSlug: club).map(\.kickoffUtc)
    let inPlay = snapshot.rows(inPlayAt: now, clubSlug: club)

    // ⚠ The window test uses the WHOLE snapshot, not the club filter: two
    // widgets configured to different clubs must not disagree about whether
    // the poll ran, and `live.json` is shared between them anyway.
    let anyInWindow = snapshot
      .rows(inPlayAt: now, clubSlug: nil)
      .contains { now.timeIntervalSince($0.kickoffUtc) <= 150 * 60 }

    var state = WidgetLiveState.load()
    if drawsLive, anyInWindow, let route = await LiveFetch.fetch() {
      let merged = LiveMerge.merge(
        previous: state,
        route: route,
        inPlay: snapshot.rows(inPlayAt: now, clubSlug: nil),
        now: now
      )
      merged.save()
      state = merged
    }

    let anyLive = inPlay.contains { row in
      state?.match(for: row.fixtureId).map(\.isLive) ?? true // nil = kicked off
    }

    if drawsLive, !inPlay.isEmpty, anyLive {
      // A match is being played: per-minute ENTRIES until the next 5-minute
      // reload re-polls (ADR 0080). Entries are free; the reload is the
      // rationed thing, and 5 minutes of them fit the budget with room.
      let entries = Cadence.liveEntryDates(from: now).map {
        entry(at: $0, snapshot: snapshot, club: club, state: state)
      }
      return Timeline(entries: entries, policy: .after(now.addingTimeInterval(Cadence.liveReload)))
    }

    let entries = Cadence.entryDates(from: now, kickoffs: kickoffs).map {
      entry(at: $0, snapshot: snapshot, club: club, state: state)
    }

    // ⚠ ONE reload policy for a timeline that may hold a hundred entries. See
    // `Cadence` — entries are free, reloads are rationed, and per-minute
    // RELOADS are the thing ADR 0025 forbids (outside 0080's live window).
    return Timeline(
      entries: entries.isEmpty
        ? [entry(at: now, snapshot: snapshot, club: club, state: state)]
        : entries,
      policy: .after(Cadence.reloadAfter(now: now, kickoffs: kickoffs))
    )
  }

  private func entry(
    at date: Date,
    snapshot: WidgetSnapshot,
    club: String?,
    state: WidgetLiveState? = nil
  ) -> FixtureEntry {
    let live = snapshot.rows(inPlayAt: date, clubSlug: club).compactMap { row -> FixtureEntry.LivePair? in
      let match = state?.match(for: row.fixtureId)
      // A finished entry earns its ledger only while `live.json` HOLDS a
      // result for it; a kicked-off one (nil match) earns it only inside the
      // 150-minute hold — a nil match on a match played this morning is not
      // "in play", it is a snapshot the app has not refreshed.
      if match == nil, date.timeIntervalSince(row.kickoffUtc) > 150 * 60 { return nil }
      return FixtureEntry.LivePair(row: row, match: match)
    }

    return FixtureEntry(
      date: date,
      copy: snapshot.copy,
      rows: snapshot.rows(after: date, clubSlug: club),
      live: live,
      liveStale: state?.isStale(at: date) ?? false,
      followsNothing: snapshot.followsNothing
    )
  }
}
