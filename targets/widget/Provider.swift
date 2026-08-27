import WidgetKit

/// One rendered instant: the rows still ahead at `date`.
struct FixtureEntry: TimelineEntry {
  let date: Date
  let copy: WidgetSnapshot.Copy
  let rows: [WidgetSnapshot.Entry]
  /// True when the reader follows nothing at all — a different empty state from
  /// "follows clubs, none of them are playing in the window".
  let followsNothing: Bool
}

/// The shared provider behind both widgets.
///
/// ⚠ Reads the App Group and nothing else — no network, no API client, no crest
/// fetch. Everything it needs was written by `src/features/widgets/snapshot.ts`
/// on the app's last foreground.
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
    let club = configuration.club?.id
    let kickoffs = snapshot.rows(after: now, clubSlug: club).map(\.kickoffUtc)

    let entries = Cadence.entryDates(from: now, kickoffs: kickoffs).map {
      entry(at: $0, snapshot: snapshot, club: club)
    }

    // ⚠ ONE reload policy for a timeline that may hold a hundred entries. See
    // `Cadence` — entries are free, reloads are rationed, and per-minute
    // RELOADS are the thing ADR 0025 forbids.
    return Timeline(
      entries: entries.isEmpty ? [entry(at: now, snapshot: snapshot, club: club)] : entries,
      policy: .after(Cadence.reloadAfter(now: now, kickoffs: kickoffs))
    )
  }

  private func entry(
    at date: Date,
    snapshot: WidgetSnapshot,
    club: String?
  ) -> FixtureEntry {
    FixtureEntry(
      date: date,
      copy: snapshot.copy,
      rows: snapshot.rows(after: date, clubSlug: club),
      followsNothing: snapshot.followsNothing
    )
  }
}
