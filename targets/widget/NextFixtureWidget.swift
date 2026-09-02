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
        .containerBackground(for: .widget) { MeshPlate() }
    }
    .configurationDisplayName("Next match")
    .description("The next match for the clubs you follow.")
    .supportedFamilies([
      .systemSmall,
      .accessoryRectangular,
      .accessoryCircular,
      .accessoryInline,
    ])
    // ⚠⚠ **Needed so the mesh runs flush, and it is why the view re-applies
    // `widgetContentMargins` by hand.** Left on, the system's ~16pt margins
    // leave the ground floating in a black frame — the card-inside-a-card ADR
    // 0086 measured on the medium tile. But this modifier is CONFIGURATION-wide
    // and there is no per-family form, so disabling it here would also strip the
    // Lock Screen accessories' margins. `NextFixtureView` hands those exactly
    // what the system would have given them; only `systemSmall` gets our own.
    .contentMarginsDisabled()
  }
}

struct NextFixtureView: View {
  @Environment(\.widgetFamily) private var family

  /// ⚠ The insets `.contentMarginsDisabled()` just took away. Handing them back
  /// to the accessory families is what makes that modifier safe — see the
  /// configuration above. iOS 17.0, which is this target's floor exactly.
  @Environment(\.widgetContentMargins) private var systemMargins

  let entry: FixtureEntry

  private var row: WidgetSnapshot.Entry? { entry.rows.first }

  /// The match being played — earliest kickoff when two are (ADR 0080), and
  /// it OUTRANKS the countdown: nothing outranks a match being played right
  /// now, the same product rule as the Today board's lead card (ADR 0063).
  private var live: FixtureEntry.LivePair? { entry.live.first }

  var body: some View {
    Group {
      switch family {
      case .accessoryRectangular: rectangular
      case .accessoryCircular: circular
      case .accessoryInline: inline
      default: small
      }
    }
    .padding(family == .systemSmall ? Self.tileMargins : systemMargins)
    .widgetURL((live?.row ?? row).flatMap(W.url))
  }

  /// ⚠ 13, matching the medium tile's leading/trailing (ADR 0086) so two widgets
  /// side by side on one page have their type on the same gutter.
  private static let tileMargins = EdgeInsets(top: 13, leading: 13, bottom: 13, trailing: 13)

  // MARK: Home screen

  /// ⚠ **Centred, and the crests are the subject** (ADR 0058). The first cut had
  /// this column left-aligned with 30pt crests under a 30pt countdown, which made
  /// the card a clock with two badges on it — the same inverted hierarchy
  /// [0034](../../.claude/decisions/0034-next-up-card-live-seconds-countdown.md)
  /// corrected on the Today board. The clubs are what the reader is looking for.
  private var small: some View {
    Group {
      if let live {
        smallLive(live)
      } else if let row {
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

          // ⚠ `ink62`, up from `ink55` (ADR 0096): the app found its faint inks
          // read a tier weaker once the ground was lit rather than flat black,
          // and stepped every one of them up. Same ground here now.
          Text(footer(row))
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Tok.ink62)
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

  // MARK: The live ledger (ADR 0080)

  /// Direction B from the design canvas: header, two team rows, footnote.
  private func smallLive(_ pair: FixtureEntry.LivePair) -> some View {
    let finished = pair.match?.status == "finished"
    let minute = Ledger.minuteText(pair, copy: entry.copy, at: entry.date, stale: entry.liveStale)

    return VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .center) {
        if finished {
          W.eyebrow(entry.copy.fullTimeLabel, color: Tok.ink55)
        } else {
          LiveEyebrow(text: entry.copy.liveLabel)
        }
        Spacer(minLength: 4)
        if finished {
          Mark(size: 18)
        } else if let minute {
          Text(minute.text)
            .font(Tok.numerals(13, .heavy))
            .foregroundStyle(minute.color)
        }
      }

      // ⚠ **A recessed glass panel, not bare rows (ADR 0104).** This is the
      // app's own recession idiom — `match-events.tsx` drops its panel onto
      // `recess` for exactly this reason: a block of live numbers has to read as
      // a thing being reported INTO the tile, one plane below the eyebrow and
      // footnote around it. On a lit ground a flat block of text reads as part
      // of the ground.
      GlassSurface(radius: Rad.tile, dim: true, scrim: true) {
        LedgerRows(pair: pair, copy: entry.copy)
          .padding(.horizontal, 9)
          .padding(.vertical, 8)
          .frame(maxWidth: .infinity)
      }
      .padding(.top, 10)

      Spacer(minLength: 4)

      Text(finished ? nextFooter() ?? Ledger.footnote(pair) ?? "" : Ledger.footnote(pair) ?? "")
        .font(.system(size: 11.5, weight: .medium))
        .foregroundStyle(Tok.ink62)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
  }

  /// The full-time card's hand-off: `NEXT · Sun 3:30 pm · GIR`. Nil when the
  /// snapshot holds nothing ahead — the honest degradation is the venue.
  private func nextFooter() -> String? {
    guard let next = entry.rows.first else { return nil }
    return "\(entry.copy.next) · \(next.kickoffLabel) · \(next.opponentAbbr)"
  }

  /// `CEL 1–0 ATH` — the accessory families' scoreline. ⚠ En dash, closed up,
  /// matching the notification card's `scoreline`.
  private func scoreLabel(_ pair: FixtureEntry.LivePair) -> String {
    let home = Ledger.score(pair.match?.homeGoals)
    let away = Ledger.score(pair.match?.awayGoals)
    return "\(pair.row.homeAbbr) \(home)–\(away) \(pair.row.awayAbbr)"
  }

  /// `LIVE · 67′` / `HT` / `FT`, tint-agnostic for the Lock Screen.
  private func liveStatusLabel(_ pair: FixtureEntry.LivePair) -> String {
    let minute = Ledger.minuteText(pair, copy: entry.copy, at: entry.date, stale: entry.liveStale)
    guard let minute else { return entry.copy.liveLabel }
    if pair.match?.status == "live" {
      return "\(entry.copy.liveLabel) · \(minute.text)"
    }
    return minute.text
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
      if let live {
        Text(liveStatusLabel(live))
          .font(.system(size: 11, weight: .semibold))
          .textCase(.uppercase)
          .widgetAccentable()
          .lineLimit(1)
        Text(scoreLabel(live))
          .font(.system(size: 15, weight: .bold).monospacedDigit())
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(Ledger.footnote(live) ?? live.row.kickoffLabel)
          .font(.system(size: 12, weight: .medium).monospacedDigit())
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      } else if let row {
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
      if let live {
        VStack(spacing: 0) {
          Text("\(Ledger.score(live.match?.homeGoals))–\(Ledger.score(live.match?.awayGoals))")
            .font(.system(size: 16, weight: .heavy).monospacedDigit())
            .lineLimit(1)
            .minimumScaleFactor(0.7)
          Text(
            Ledger.minuteText(live, copy: entry.copy, at: entry.date, stale: entry.liveStale)?
              .text ?? entry.copy.liveLabel
          )
          .font(.system(size: 11, weight: .bold).monospacedDigit())
          .widgetAccentable()
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        }
        .padding(2)
      } else if let row {
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
      if let live {
        Text("\(scoreLabel(live)) · \(liveStatusLabel(live))")
      } else if let row {
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
