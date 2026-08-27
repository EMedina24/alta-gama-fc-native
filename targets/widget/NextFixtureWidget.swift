import SwiftUI
import WidgetKit

/// **NEXT** — the soonest match, small and on the Lock Screen (SPEC §4).
struct NextFixtureWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: "NextFixture",
      intent: SelectClubIntent.self,
      provider: FixtureProvider()
    ) { entry in
      NextFixtureView(entry: entry)
        // ⚠ Required from iOS 17. Without it the widget draws on nothing and
        // the home screen's own wallpaper shows through the card.
        .containerBackground(Tok.ground, for: .widget)
    }
    .configurationDisplayName("Next match")
    .description("The next match for the clubs you follow.")
    .supportedFamilies([
      .systemSmall,
      .accessoryRectangular,
      .accessoryCircular,
      .accessoryInline,
    ])
  }
}

struct NextFixtureView: View {
  @Environment(\.widgetFamily) private var family
  let entry: FixtureEntry

  private var row: WidgetSnapshot.Entry? { entry.rows.first }

  var body: some View {
    Group {
      switch family {
      case .accessoryRectangular: rectangular
      case .accessoryCircular: circular
      case .accessoryInline: inline
      default: small
      }
    }
    .widgetURL(row.flatMap(W.url))
  }

  // MARK: Home screen

  private var small: some View {
    Group {
      if let row {
        VStack(alignment: .leading, spacing: 0) {
          HStack(alignment: .top) {
            W.eyebrow(eyebrowText(row))
            Spacer(minLength: 4)
            Mark(size: 18)
          }

          CrestPair(row: row, copy: entry.copy, size: 30)
            .padding(.top, 10)

          Spacer(minLength: 8)

          Text(Cadence.countdown(from: entry.date, to: row.kickoffUtc))
            .font(Tok.numerals(30, .heavy))
            .foregroundStyle(Tok.ink)
            .lineLimit(1)
            .minimumScaleFactor(0.6)

          Text(footer(row))
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Tok.ink55)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .padding(.top, 2)
        }
      } else {
        EmptyState(copy: entry.copy, followsNothing: entry.followsNothing)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  // MARK: Lock Screen
  //
  // ⚠ The accessory families are rendered by the system in a single vibrant
  // tint: colours here are IGNORED, not merely muted. Everything below has to
  // read from shape, weight and hierarchy alone, which is why the crests are
  // dropped for abbreviations — a lettered tile and a club badge become the same
  // grey blob at this size.

  private var rectangular: some View {
    VStack(alignment: .leading, spacing: 1) {
      if let row {
        Text(eyebrowText(row))
          .font(.system(size: 11, weight: .semibold))
          .textCase(.uppercase)
          .widgetAccentable()
          .lineLimit(1)
        Text(W.pairLabel(row, copy: entry.copy))
          .font(.system(size: 15, weight: .bold))
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text("\(Cadence.countdown(from: entry.date, to: row.kickoffUtc)) · \(row.kickoffLabel)")
          .font(.system(size: 12, weight: .medium).monospacedDigit())
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      } else {
        Text(entry.followsNothing ? entry.copy.followPrompt : entry.copy.noFixtures)
          .font(.system(size: 13, weight: .semibold))
          .lineLimit(2)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private var circular: some View {
    Group {
      if let row {
        VStack(spacing: 0) {
          Text(row.opponentAbbr)
            .font(.system(size: 12, weight: .bold))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text(Cadence.compact(from: entry.date, to: row.kickoffUtc))
            .font(.system(size: 16, weight: .heavy).monospacedDigit())
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
        .padding(2)
      } else {
        Mark(size: 20, color: .primary)
      }
    }
  }

  private var inline: some View {
    Group {
      if let row {
        Text("\(W.pairLabel(row, copy: entry.copy)) · \(Cadence.countdown(from: entry.date, to: row.kickoffUtc))")
      } else {
        Text(entry.followsNothing ? entry.copy.followPrompt : entry.copy.noFixtures)
      }
    }
  }

  // MARK: Strings
  //
  // ⚠ Assembled, never translated. Both halves already arrived in the reader's
  // language from `snapshot.ts` — see the header of `Snapshot.swift`.

  private func eyebrowText(_ row: WidgetSnapshot.Entry) -> String {
    guard let round = row.roundLabel else { return entry.copy.next }
    return "\(entry.copy.next) · \(round)"
  }

  private func footer(_ row: WidgetSnapshot.Entry) -> String {
    guard let venue = row.venue else { return row.kickoffLabel }
    return "\(row.kickoffLabel) · \(venue)"
  }
}
