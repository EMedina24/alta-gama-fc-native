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

  /// ⚠ **Centred, and the crests are the subject** (ADR 0058). The first cut had
  /// this column left-aligned with 30pt crests under a 30pt countdown, which made
  /// the card a clock with two badges on it — the same inverted hierarchy
  /// [0034](../../.claude/decisions/0034-next-up-card-live-seconds-countdown.md)
  /// corrected on the Today board. The clubs are what the reader is looking for.
  private var small: some View {
    Group {
      if let row {
        VStack(alignment: .center, spacing: 0) {
          // ⚠ `maxWidth: .infinity` — without it the centred parent pulls this
          // row in on itself and the eyebrow and mark drift toward the middle
          // instead of sitting on the card's two edges.
          HStack(alignment: .top) {
            W.eyebrow(eyebrowText(row))
            Spacer(minLength: 4)
            Mark(size: 18)
          }
          .frame(maxWidth: .infinity)

          // ⚠ 38 is derived, not eyeballed: the small widget's usable width is
          // ~109pt on an iPhone SE, and `38 + 10 + v + 10 + 38 ≈ 99` is the
          // largest pair that fits there without the system scaling it down.
          CrestPair(row: row, copy: entry.copy, size: 38)
            .padding(.top, 8)

          Spacer(minLength: 4)

          countdown(row)

          Text(footer(row))
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Tok.ink55)
            .multilineTextAlignment(.center)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .padding(.top, 2)
        }
      } else {
        EmptyState(copy: entry.copy, followsNothing: entry.followsNothing, alignment: .center)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }

  /// The figure that moves — `9:34:12` ticking inside the final 12 hours,
  /// `1d 14h` repainting hourly beyond them (ADR 0058).
  ///
  /// ⚠⚠ **`Text(timerInterval:)` is drawn and ticked BY THE SYSTEM, once a
  /// second, for zero reloads and zero extension wakes.** It does not touch the
  /// timeline budget and so does not contradict ADR 0025 step 5 / 0047, which
  /// forbid a per-minute *reload* — a different, rationed thing. `MatchActivity`'s
  /// `Clock` already leans on exactly this mechanism.
  ///
  /// ⚠ The 12h split exists because the timer's format is the SYSTEM's: one text
  /// run, one style, and **no days unit** — a fixture days out rendered
  /// `288:14:23`. `countdown.tsx`'s `1d 18h 04m 12s` with its accent seconds
  /// group cannot be reproduced here at any price; `Cadence.liveTickWithin` is
  /// the one number that moves the boundary.
  @ViewBuilder
  private func countdown(_ row: WidgetSnapshot.Entry) -> some View {
    if row.kickoffUtc.timeIntervalSince(entry.date) <= Cadence.liveTickWithin {
      // ⚠ The `max` is not defensive noise. A ClosedRange whose bounds invert
      // TRAPS, and an extension that crashes draws a blank grey tile with
      // nothing in any log. `snapshot.rows(after:)` already filters to
      // `kickoffUtc > date`, so this should be unreachable — which is precisely
      // the kind of guarantee worth one call to not depend on.
      Text(
        timerInterval: entry.date...max(entry.date.addingTimeInterval(1), row.kickoffUtc),
        countsDown: true
      )
      .font(Tok.numerals(20, .heavy))
      .foregroundStyle(Tok.ink)
      .multilineTextAlignment(.center)
      .lineLimit(1)
      .minimumScaleFactor(0.5)
    } else {
      Text(Cadence.countdown(from: entry.date, to: row.kickoffUtc))
        .font(Tok.numerals(20, .heavy))
        .foregroundStyle(Tok.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.6)
    }
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
