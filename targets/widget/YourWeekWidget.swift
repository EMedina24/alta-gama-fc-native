import SwiftUI
import WidgetKit

/// **YOUR WEEK** — the next three matches, medium (SPEC §4).
struct YourWeekWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: "YourWeek",
      intent: SelectClubIntent.self,
      provider: FixtureProvider()
    ) { entry in
      YourWeekView(entry: entry)
        .containerBackground(Tok.ground, for: .widget)
    }
    .configurationDisplayName("Your week")
    .description("The next three matches from the clubs you follow.")
    .supportedFamilies([.systemMedium])
  }
}

struct YourWeekView: View {
  let entry: FixtureEntry

  private var rows: [WidgetSnapshot.Entry] { Array(entry.rows.prefix(3)) }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header

      if rows.isEmpty {
        EmptyState(copy: entry.copy, followsNothing: entry.followsNothing)
          .padding(.top, 10)
      } else {
        // ⚠ **Draw the rows there are — never filler rows or `—` placeholders**,
        // which both read as data the widget failed to load. A reader following
        // one club has one row, and that is the truth.
        //
        // ⚠ But CENTRE the group rather than pinning it to the top. Top-aligned,
        // a single row leaves four fifths of the card empty and reads as a
        // widget that failed to finish loading — which is the same lie the
        // filler rows would have told, arrived at by omission. With three rows
        // the spacers collapse to nothing and the layout is unchanged.
        Spacer(minLength: 0)
        ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
          if index > 0 {
            Rectangle()
              .fill(Tok.hairline)
              .frame(height: 1)
          }
          fixtureRow(row)
        }
        Spacer(minLength: 0)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  private var header: some View {
    HStack(spacing: 6) {
      Mark(size: 16)
      W.eyebrow(entry.copy.yourWeek)
      Spacer(minLength: 4)
      W.eyebrow(entry.copy.clubCount, color: Tok.ink45, size: 10)
    }
    .padding(.bottom, 8)
  }

  /// ⚠ **`Link` per row, never one `widgetURL` on the body.** A medium widget
  /// with three clubs on it has three destinations, and `widgetURL` can only
  /// carry one — the two together are a documented conflict where the row taps
  /// silently lose. The small widget has exactly one fixture, so it uses
  /// `widgetURL` instead.
  private func fixtureRow(_ row: WidgetSnapshot.Entry) -> some View {
    Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      HStack(spacing: 9) {
        // The FOLLOWED club's crest leads and the OPPONENT is named — the row
        // answers "who are we playing", which is what a per-club list is for.
        CrestView(
          fixtureId: row.fixtureId,
          slot: row.isHome ? "home" : "away",
          abbr: row.isHome ? row.homeAbbr : row.awayAbbr,
          size: 22
        )

        Text(W.opponentLabel(row, copy: entry.copy))
          .font(.system(size: 13.5, weight: .semibold))
          .foregroundStyle(Tok.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.75)

        Spacer(minLength: 6)

        Text(row.kickoffLabel)
          .font(Tok.numerals(14, .semibold))
          .foregroundStyle(Tok.ink78)
          .lineLimit(1)
      }
      .padding(.vertical, 7)
    }
  }
}
