import SwiftUI
import WidgetKit

/// **YOUR WEEK** — the week ahead, medium (ADR 0086, `handoff_week-widget/`).
///
/// A week has one next match, not three. The tile spends the left column on that
/// kickoff and demotes the rest to a rail — the hero open on the ground, the
/// rail grouped onto one glass column beside it.
///
/// ⚠ **The floodlit plate is gone (ADR 0104).** This tile borrowed the Live
/// Activity's lit language because the app had nothing else to borrow; the app
/// now has the aurora mesh and the glass card, and a widget that opens a lit
/// mesh should not itself be a black tile with a lime corner.
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
        .containerBackground(for: .widget) { MeshPlate() }
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

  /// The mock's `1.32fr / 1fr`.
  ///
  /// ⚠ A `layoutPriority` cannot express a ratio — it decides who gets its
  /// ideal size first, not how the slack is split — so the column widths are
  /// measured off the geometry instead.
  ///
  /// ⚠⚠ **`- 6`, where ADR 0086 had `- 26 - 0.5`, and the rail keeps its
  /// measured content box to within a sixth of a point.** The fading hairline
  /// and one of the two 13pt gaps went with the plate — the rail's own glass
  /// edge is the seam now, so the row no longer pays for a drawn one — and the
  /// width that frees up is handed straight back as the slab's 4.5pt inset.
  /// The arithmetic is exact and width-independent: the rail gains `20.5/2.32`
  /// = 8.84pt and spends 9pt on the inset, so its content lands within 0.2pt of
  /// 0086's number at EVERY tile width (125.6 → 125.5 on this device, 119.2 →
  /// 119.1 on an SE). The hero takes the rest and gains 11.7pt everywhere.
  ///
  /// ⚠ **The rail is the constraint, not the hero, and 12-hour locales are why.**
  /// The `?sample=` fixtures print `16:15`; a US reader gets `10:15 am`, which is
  /// far wider and truncates the club name beside it. 0086 chose truncation over
  /// shrinking deliberately — see `railName` — but that choice was measured
  /// against 0086's column, so this one has to match it rather than approximate
  /// it. Change either constant and re-derive both columns.
  private func heroWidth(_ total: CGFloat) -> CGFloat {
    max(0, (total - 6)) * 1.32 / 2.32
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header

      if let hero {
        GeometryReader { geo in
          HStack(spacing: 6) {
            // ⚠ ONE fixture draws the hero at FULL WIDTH — no divider, no empty
            // rail. A hairline with nothing beside it reads as a widget that
            // failed to finish loading, which is the same lie the filler rows
            // the old layout refused would have told.
            // ⚠ `spoken` is the harness's 114pt hero against this body, plus
            // margin (ADR 0108): a standard tile's 124pt body affords the
            // spoken day line; a mini's 112 and an SE's ≤109 do not, and fall
            // back to the inline tag. Height, not device — Dynamic Type moves
            // nothing here (the tile's type is fixed), so the branch is stable.
            heroColumn(hero, spoken: geo.size.height >= 118)
              .frame(width: rail.isEmpty ? nil : heroWidth(geo.size.width),
                     alignment: .leading)

            if !rail.isEmpty {
              // ⚠ **The glass column is FULL HEIGHT beside the hero, and that is
              // deliberate.** A slab that wrapped its two rows would sit as a
              // short box floating against a tall one; run to both edges of the
              // content area and it reads as the tile's second column, which is
              // what it is.
              GlassSurface(radius: Rad.tile) {
                Group {
                  // ⚠ ONE fixture behind the hero draws as a CARD, not a
                  // squeezed row (ADR 0109): a lone row floats mid-column with
                  // its names truncated beside a 12-hour time ("Valen…" on
                  // live data). The column's height is the space to spend.
                  if rail.count == 1, let solo = rail.first {
                    railSolo(solo, roomy: geo.size.height >= 118)
                      .padding(.horizontal, 10)
                  } else {
                    railColumn
                      // ⚠ 4.5, and it is load-bearing arithmetic rather than a
                      // taste: 9pt of inset is what the rail gains back from
                      // the dropped gap, so this is what keeps its content box
                      // equal to ADR 0086's measured one. See `heroWidth`.
                      .padding(.horizontal, 4.5)
                      .padding(.vertical, 3)
                  }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
              }
              .frame(maxWidth: .infinity, maxHeight: .infinity)
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

  // MARK: Hero

  /// The next kickoff: the SPOKEN day over the time (ADR 0108), then the two
  /// clubs stacked home over away.
  ///
  /// ⚠⚠ **`Viernes` in full, on its own line — and only where it FITS.** The
  /// old inline `VIE` tag wore the tile's lime tag voice (TU SEMANA and FUERA
  /// wear the same dress) and was read as furniture, not a day. The spoken
  /// line answers that — but it costs height: the hero measures 114pt against
  /// a 124pt body on a standard tile, 112 on a mini and ≤109 on an SE
  /// (`ImageRenderer` harness, ADR 0108). `spoken` is that measurement as a
  /// branch: compact tiles keep the inline tag, which is why `kickoffDay`
  /// still travels on a v5 snapshot. Do not add height here without re-running
  /// the harness.
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
  private func heroColumn(_ row: WidgetSnapshot.Entry, spoken: Bool) -> some View {
    // The spoken line replaces the inline tag; both never draw together.
    let saysDay = spoken && row.kickoffDayName != nil

    return Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      VStack(alignment: .leading, spacing: 7) {
        VStack(alignment: .leading, spacing: 3) {
          if saysDay, let dayName = row.kickoffDayName {
            Text(dayName)
              .font(.system(size: 15, weight: .semibold))
              .tracking(-0.2)
              .foregroundStyle(Tok.accent)
              .lineLimit(1)
          }

          HStack(alignment: .firstTextBaseline, spacing: 7) {
            Text(row.kickoffTime ?? row.kickoffLabel)
              .font(Tok.numerals(27, .ultraLight))
              .tracking(-0.95)
              .foregroundStyle(Tok.ink)
              .lineLimit(1)

            if !saysDay, let day = row.kickoffDay {
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
                // ⚠ `glassFill`/`glassLine`, the app's named pair — the same
                // values this site already used by hand, now tracking `theme.ts`.
                // ⚠ r4 stays: at 13pt tall a `Rad.chip` corner is a pill, and a
                // pill here would read as the accent capsule the header owns.
                .background(
                  RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .fill(Tok.glassFill)
                )
                .overlay(
                  RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .strokeBorder(Tok.glassLine, lineWidth: 0.5)
                )
                .fixedSize()
            }
          }
          .fixedSize(horizontal: false, vertical: true)
        }

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
      CrestView(fixtureId: row.fixtureId, slot: slot, abbr: abbr, size: 24, tone: .open)
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
      // ⚠ Rows CENTRE in the column, the same idiom `NewsView` uses for the
      // space its lead leaves: a week that returned two fixtures must not look
      // like one that failed to finish loading.
      Spacer(minLength: 0)
      ForEach(Array(rail.enumerated()), id: \.element.id) { index, row in
        // ⚠ The first row draws no rule — a rule under the header would read as
        // a second divider rather than a separator between two rows.
        if index > 0 {
          Rectangle().fill(Tok.hairline).frame(height: 0.5)
        }
        railRow(row)
      }
      Spacer(minLength: 0)
    }
  }

  private func railRow(_ row: WidgetSnapshot.Entry) -> some View {
    Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      HStack(spacing: 6) {
        // Butted 1pt apart: at 13pt the pair reads as one object — the fixture
        // — rather than as two badges with something missing between them.
        HStack(spacing: 1) {
          CrestView(fixtureId: row.fixtureId, slot: "home", abbr: row.homeAbbr, size: 13, tone: .open)
          CrestView(fixtureId: row.fixtureId, slot: "away", abbr: row.awayAbbr, size: 13, tone: .open)
        }

        VStack(alignment: .leading, spacing: 2.5) {
          railName(row.homeName ?? row.homeAbbr, followed: row.isHome, weight: .semibold)
          railName(row.awayName ?? row.awayAbbr, followed: !row.isHome, weight: .medium)
        }

        Spacer(minLength: 2)

        VStack(alignment: .trailing, spacing: 2.5) {
          railDay(row)
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

  /// `Dom 6`, sentence case with the date — a code beside a number reads as a
  /// date, alone it reads as a badge (ADR 0108). Costs no width in the row:
  /// the time beside it is wider on every clock (28 v ~42pt, measured). The
  /// tracked uppercase form is the v4 fallback only.
  @ViewBuilder
  private func railDay(_ row: WidgetSnapshot.Entry) -> some View {
    if let dated = row.kickoffDayDate {
      Text(dated)
        .font(.system(size: 8, weight: .semibold))
        .tracking(0.2)
        .foregroundStyle(Tok.ink45)
    } else if let day = row.kickoffDay {
      Text(day)
        .font(.system(size: 8, weight: .semibold))
        .tracking(1.1)
        .foregroundStyle(Tok.ink45)
    }
  }

  /// The rail's ONE-fixture form (ADR 0109): a card that SPENDS the column —
  /// clubs named in full anchored to the top, the kickoff block anchored to
  /// the bottom, the flexible gap between them. The multi-row format in a
  /// column with one occupant truncated both names beside a 12-hour time and
  /// floated the row in ~90pt of empty glass.
  ///
  /// ⚠ Clubs FIRST, kickoff below — the small NEXT tile's order (0107),
  /// deliberately not the hero's: the hero beside this card already leads
  /// with the kickoff, and two tellings of "when" stacked level with each
  /// other would race. Subordinate scale throughout: 18pt medium time against
  /// the hero's 27 ultralight, 20pt crests against its 24.
  ///
  /// ⚠ `roomy` is the hero's own 118pt height branch (ADR 0108): the full
  /// card is ~102pt minimum against a 118pt standard column but overflows a
  /// zoomed SE's ~95; compact tiles take the smaller cut (~90pt). Same
  /// measurement, same threshold, one constant to move.
  ///
  /// ⚠ A `Link` like every rail row — `widgetURL` carries one destination and
  /// this tile has up to three.
  private func railSolo(_ row: WidgetSnapshot.Entry, roomy: Bool) -> some View {
    Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      VStack(alignment: .leading, spacing: 0) {
        VStack(alignment: .leading, spacing: 5) {
          soloSide(row, slot: "home", followed: row.isHome, roomy: roomy)
          soloSide(row, slot: "away", followed: !row.isHome, roomy: roomy)
        }

        Spacer(minLength: 6)

        railDay(row)
        Text(row.kickoffTime ?? row.kickoffLabel)
          .font(Tok.numerals(roomy ? 18 : 15, .medium))
          .tracking(-0.3)
          .foregroundStyle(Tok.ink)
          .lineLimit(1)
          .padding(.top, 2.5)
      }
      .padding(.vertical, 8)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }

  /// ⚠ `homeName`/`awayName` are nil on a v1 snapshot; the abbr is the
  /// fallback, never a blank — the same rule as `heroSide`. The worst name
  /// (`R. Sociedad`, 61pt at 10.5pt) has 98pt on a standard tile and 67 on an
  /// SE; the scale factor is the SE's 4pt of margin, engaged nowhere else.
  private func soloSide(
    _ row: WidgetSnapshot.Entry, slot: String, followed: Bool, roomy: Bool
  ) -> some View {
    let isHome = slot == "home"
    let abbr = isHome ? row.homeAbbr : row.awayAbbr
    let name = (isHome ? row.homeName : row.awayName) ?? abbr

    return HStack(spacing: 5) {
      CrestView(
        fixtureId: row.fixtureId, slot: slot, abbr: abbr,
        size: roomy ? 20 : 16, tone: .open
      )
      Text(name)
        .font(.system(size: roomy ? 10.5 : 9.5, weight: .semibold))
        .tracking(-0.14)
        .foregroundStyle(followed ? Tok.accent : Tok.ink90)
        .lineLimit(1)
        .minimumScaleFactor(0.85)
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
