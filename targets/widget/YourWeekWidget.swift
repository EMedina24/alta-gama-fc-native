import SwiftUI
import WidgetKit

/// **YOUR WEEK** — the week ahead, medium (ADR 0086, `handoff_week-widget/`).
///
/// A week has one next match, not three. The tile spends the left column on that
/// kickoff and demotes the rest to a rail, on a floodlit plate — the visual
/// language ADR 0085 gave the Live Activity, at widget scale.
///
/// ⚠ **`.contentMarginsDisabled()`, and the plate is the CONTAINER background.**
/// The mock draws a nested tray (r24) inside a plate (r21.5); a second corner
/// radius inside the system's own container mask double-rounds every edge, which
/// is the mistake ADR 0085 §1 already caught on the Live Activity. The system
/// corner IS the tray — disabling the margins is what puts the plate against it.
struct YourWeekWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: "YourWeek",
      intent: SelectClubIntent.self,
      provider: FixtureProvider()
    ) { entry in
      YourWeekView(entry: entry)
        // ⚠ Required from iOS 17. Without it the widget draws on nothing and
        // the home screen's own wallpaper shows through the card.
        .containerBackground(for: .widget) { Plate() }
    }
    .configurationDisplayName("Your week")
    .description("The next match from the clubs you follow, and the week behind it.")
    .supportedFamilies([.systemMedium])
    // ⚠ Without this the system's ~16pt margins leave the plate floating in a
    // black frame — a card inside a card, which is the look the flush plate
    // exists to avoid. Content supplies its own 11/13 padding instead.
    .contentMarginsDisabled()
  }
}

// MARK: - Plate

/// The lit ground: two gradients over `Tok.ground`, plus the mock's inner
/// highlight along the top edge.
///
/// ⚠⚠ **Decoration only, never a data channel.** Nothing here may encode
/// liveness, the followed side, or how many fixtures there are — the moment a
/// reader can learn something from the light, the light has to be correct.
///
/// ⚠ **`EllipticalGradient`, not `RadialGradient`.** The mock's
/// `radial-gradient(70% 90% at 100% -8%, …)` is an ellipse wider than it is
/// tall; SwiftUI's radial gradient is strictly circular, and the handoff's
/// hard-coded `endRadius: 190` lands nowhere near it at any tile width. Same
/// substitution `MatchActivity.floodlights` documents.
private struct Plate: View {
  var body: some View {
    Tok.ground.overlay {
      ZStack {
        // The floodlight, off the top-right corner.
        EllipticalGradient(
          colors: [Tok.accent.opacity(0.20), Tok.ground.opacity(0)],
          center: UnitPoint(x: 1, y: -0.08),
          startRadiusFraction: 0,
          endRadiusFraction: 0.62
        )
        // ⚠ The pitch pool, bottom-left, and its job is the same one it has on
        // the broadcast card: keep the lime OFF club artwork we do not own.
        EllipticalGradient(
          colors: [Tok.activityPool.opacity(0.9), Tok.ground.opacity(0)],
          center: UnitPoint(x: -0.06, y: 1.08),
          startRadiusFraction: 0,
          endRadiusFraction: 0.66
        )
      }
    }
    .overlay(alignment: .top) {
      Rectangle().fill(Tok.hairline).frame(height: 0.5)
    }
  }
}

// MARK: - Tile

struct YourWeekView: View {
  let entry: FixtureEntry

  /// Hero plus at most two rail rows.
  ///
  /// ⚠ **No live ledger here any more** (ADR 0086). `entry.live` and
  /// `entry.liveStale` are still on the entry because `NextFixtureView` draws
  /// them; this tile deliberately reads neither. A match in play is simply
  /// absent — `rows(after:)` filters on `kickoffUtc > now` — and the hero
  /// becomes the next kickoff after it. The tile says what is COMING.
  private var rows: [WidgetSnapshot.Entry] { Array(entry.rows.prefix(3)) }
  private var hero: WidgetSnapshot.Entry? { rows.first }
  private var rail: [WidgetSnapshot.Entry] { Array(rows.dropFirst()) }

  /// The mock's `1.32fr / 0.5pt / 1fr`.
  ///
  /// ⚠ A `layoutPriority` cannot express a ratio — it decides who gets its
  /// ideal size first, not how the slack is split — so the column widths are
  /// measured off the geometry instead.
  private func heroWidth(_ total: CGFloat) -> CGFloat {
    max(0, (total - 26 - 0.5)) * 1.32 / 2.32
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header

      if let hero {
        GeometryReader { geo in
          HStack(spacing: 13) {
            // ⚠ ONE fixture draws the hero at FULL WIDTH — no divider, no empty
            // rail. A hairline with nothing beside it reads as a widget that
            // failed to finish loading, which is the same lie the filler rows
            // the old layout refused would have told.
            heroColumn(hero)
              .frame(width: rail.isEmpty ? nil : heroWidth(geo.size.width),
                     alignment: .leading)

            if !rail.isEmpty {
              divider
              railColumn.frame(maxWidth: .infinity)
            }
          }
          // ⚠ `.leading`, not the default centre. With one fixture the HStack
          // holds only the hero and would centre it in the tile — a left-aligned
          // design floating in the middle of the plate.
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
      } else {
        // ⚠ Two different sentences for two different situations — follow a
        // club, or wait for the fixtures to be published.
        EmptyState(copy: entry.copy, followsNothing: entry.followsNothing)
          .padding(.top, 10)
      }
    }
    .padding(EdgeInsets(top: 11, leading: 13, bottom: 11, trailing: 13))
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  // MARK: Header

  private var header: some View {
    HStack(spacing: 6) {
      Mark(size: 12)
      Text(entry.copy.yourWeek)
        .font(.system(size: 8.5, weight: .semibold))
        .tracking(1.7)
        .foregroundStyle(Tok.accent)
        .lineLimit(1)
        .padding(.horizontal, 6.5)
        .frame(height: 15)
        .background(Capsule().fill(Tok.accentWash))
        .overlay(Capsule().strokeBorder(Tok.accentRing, lineWidth: 0.5))
        .fixedSize()
      Spacer(minLength: 4)
      W.eyebrow(entry.copy.clubCount, color: Tok.ink34, size: 8.5)
    }
    .padding(.bottom, 9)
  }

  /// A hairline that fades out at both ends, so it reads as a seam rather than
  /// a drawn rule butting into the padding.
  private var divider: some View {
    LinearGradient(
      colors: [Tok.hairline.opacity(0), Tok.hairline, Tok.hairline, Tok.hairline.opacity(0)],
      startPoint: .top,
      endPoint: .bottom
    )
    .frame(maxWidth: 0.5, maxHeight: .infinity)
  }

  // MARK: Hero

  /// The next kickoff: time, day and side tag on one baseline, then the two
  /// clubs stacked home over away.
  ///
  /// ⚠⚠ **STACKED, where the mock draws one row — and the number said so.**
  /// The mock's `crest · name · v · crest · name` wants 168pt for its own
  /// sample pair and 183pt for the realistic worst (`R. Sociedad` v
  /// `Villarreal`), against a 157pt hero column on an SE. Neither trim rescues
  /// it: dropping the `v` saves 11pt and the crests 20 → 18 save **4** — the
  /// crest is not what binds, the two names are, which is exactly the lesson
  /// ADR 0085 §3 paid for. Stacked, the same worst pair is 95pt with 62pt to
  /// spare, and the tile had 33pt of unused HEIGHT to spend. See ADR 0086.
  ///
  /// ⚠ The stack also lets the crests go 20 → 24, matching the size the ledger
  /// used on this widget before it, so the badges stay the subject.
  ///
  /// ⚠ A `Link`, never `widgetURL` — three fixtures are three destinations and
  /// `widgetURL` carries one; the two together are a documented conflict where
  /// the row taps silently lose.
  private func heroColumn(_ row: WidgetSnapshot.Entry) -> some View {
    Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      VStack(alignment: .leading, spacing: 7) {
        HStack(alignment: .firstTextBaseline, spacing: 7) {
          Text(row.kickoffTime ?? row.kickoffLabel)
            .font(Tok.numerals(27, .ultraLight))
            .tracking(-0.95)
            .foregroundStyle(Tok.ink)
            .lineLimit(1)

          if let day = row.kickoffDay {
            Text(day)
              .font(.system(size: 9.5, weight: .semibold))
              .tracking(1.5)
              .foregroundStyle(Tok.accent)
          }

          // ⚠ Neutral, not the accent capsule ADR 0059 drew. The lime is spent
          // on the followed club's NAME and the day; a third lime object beside
          // them makes the reader hunt for which one means "yours".
          if let tag = row.isHome ? entry.copy.homeTag : entry.copy.awayTag {
            Text(tag)
              .font(.system(size: 8.5, weight: .semibold))
              .tracking(1.2)
              .foregroundStyle(Tok.ink62)
              .padding(.horizontal, 5)
              .frame(height: 13)
              .background(
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                  .fill(Color.white.opacity(0.06))
              )
              .overlay(
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                  .strokeBorder(Tok.hairline, lineWidth: 0.5)
              )
              .fixedSize()
          }
        }
        .fixedSize(horizontal: false, vertical: true)

        // ⚠ Home on top, always — the same rule `W.pairLabel` states. Flipping
        // it so "your" club leads would make one match read two ways for two
        // readers, and the crests are composed home-then-away regardless.
        VStack(alignment: .leading, spacing: 5) {
          heroSide(row, slot: "home", followed: row.isHome)
          heroSide(row, slot: "away", followed: !row.isHome)
        }
      }
    }
  }

  /// ⚠ `homeName`/`awayName` are nil on a v1 snapshot; the abbr is the
  /// fallback, never a blank.
  private func heroSide(_ row: WidgetSnapshot.Entry, slot: String, followed: Bool) -> some View {
    let isHome = slot == "home"
    let abbr = isHome ? row.homeAbbr : row.awayAbbr
    let name = (isHome ? row.homeName : row.awayName) ?? abbr

    return HStack(spacing: 6) {
      CrestView(fixtureId: row.fixtureId, slot: slot, abbr: abbr, size: 24)
      Text(name)
        .font(.system(size: 11.5, weight: .semibold))
        .tracking(-0.23)
        .foregroundStyle(followed ? Tok.accent : Tok.ink90)
        .lineLimit(1)
        // ⚠ 0.74, not 0.7 — the design's floor on device is 8.5pt and
        // 11.5 × 0.74 is exactly that. Measured, this never engages.
        .minimumScaleFactor(0.74)
    }
  }

  // MARK: Rail

  private var railColumn: some View {
    VStack(spacing: 0) {
      ForEach(Array(rail.enumerated()), id: \.element.id) { index, row in
        // ⚠ The first row draws no rule — a rule under the header would read as
        // a second divider rather than a separator between two rows.
        if index > 0 {
          Rectangle().fill(Tok.hairline).frame(height: 0.5)
        }
        railRow(row)
      }
    }
  }

  private func railRow(_ row: WidgetSnapshot.Entry) -> some View {
    Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      HStack(spacing: 6) {
        // Butted 1pt apart: at 13pt the pair reads as one object — the fixture
        // — rather than as two badges with something missing between them.
        HStack(spacing: 1) {
          CrestView(fixtureId: row.fixtureId, slot: "home", abbr: row.homeAbbr, size: 13)
          CrestView(fixtureId: row.fixtureId, slot: "away", abbr: row.awayAbbr, size: 13)
        }

        VStack(alignment: .leading, spacing: 2.5) {
          railName(row.homeName ?? row.homeAbbr, followed: row.isHome, weight: .semibold)
          railName(row.awayName ?? row.awayAbbr, followed: !row.isHome, weight: .medium)
        }

        Spacer(minLength: 2)

        VStack(alignment: .trailing, spacing: 2.5) {
          if let day = row.kickoffDay {
            Text(day)
              .font(.system(size: 8, weight: .semibold))
              .tracking(1.1)
              .foregroundStyle(Tok.ink45)
          }
          Text(row.kickoffTime ?? row.kickoffLabel)
            .font(Tok.numerals(10, .medium))
            .tracking(-0.2)
            .foregroundStyle(Tok.ink90)
            .lineLimit(1)
        }
        .fixedSize()
      }
      .padding(.vertical, 6.5)
    }
  }

  /// ⚠ **Truncates rather than shrinks, and that is the design's own floor.**
  /// At 9pt a `minimumScaleFactor` low enough to rescue `R. Sociedad` in a
  /// 119pt SE rail would put the name under 8.5pt, below the smallest type this
  /// widget draws anywhere. A shorter name is a fair loss; unreadable type is
  /// not — and the kickoff beside it is a NUMBER, which must never give.
  private func railName(_ text: String, followed: Bool, weight: Font.Weight) -> some View {
    Text(text)
      .font(.system(size: 9, weight: weight))
      .tracking(-0.14)
      .foregroundStyle(followed ? Tok.accent : Tok.ink90)
      .lineLimit(1)
  }
}
