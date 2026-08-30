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

  /// Two ledger blocks at most — each is two rows tall, and three would leave
  /// no card. More than two followed clubs in play at once loses the third to
  /// the same truth the small widget states: the card shows what fits.
  private var live: [FixtureEntry.LivePair] { Array(entry.live.prefix(2)) }

  /// Upcoming rows fill what the ledgers leave: 3 slots, a ledger costs 2.
  private var rows: [WidgetSnapshot.Entry] {
    Array(entry.rows.prefix(max(0, 3 - live.count * 2)))
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header

      if !live.isEmpty {
        // ⚠ The rows there are, centred — the same rule as below.
        Spacer(minLength: 0)
        ForEach(Array(live.enumerated()), id: \.element.id) { index, pair in
          if index > 0 {
            Rectangle()
              .fill(Tok.hairline)
              .frame(height: 1)
          }
          liveBlock(pair)
        }
        ForEach(rows) { row in
          Rectangle()
            .fill(Tok.hairline)
            .frame(height: 1)
          fixtureRow(row)
        }
        Spacer(minLength: 0)
      } else if rows.isEmpty {
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
      if let first = live.first, live.contains(where: { $0.match?.isLive ?? true }) {
        // A match is being played: the card leads with it (ADR 0063's product
        // rule). `LIVE · MD 3`, the round from the earliest live row.
        LiveEyebrow(
          text: first.row.roundLabel.map { "\(entry.copy.liveLabel) · \($0)" }
            ?? entry.copy.liveLabel
        )
        Spacer(minLength: 4)
        Mark(size: 16)
      } else if !live.isEmpty {
        // Finished today, nothing in play: the eyebrow says so, quietly.
        Mark(size: 16)
        W.eyebrow(entry.copy.fullTimeLabel, color: Tok.ink55)
        Spacer(minLength: 4)
        W.eyebrow(entry.copy.clubCount, color: Tok.ink45, size: 10)
      } else {
        Mark(size: 16)
        W.eyebrow(entry.copy.yourWeek)
        Spacer(minLength: 4)
        W.eyebrow(entry.copy.clubCount, color: Tok.ink45, size: 10)
      }
    }
    .padding(.bottom, 8)
  }

  /// One live match, Direction B at medium width: the two-row ledger on the
  /// left, a hairline, and a right-hand column of minute over scorer/venue.
  ///
  /// ⚠ A `Link` like every other row — the medium widget has several
  /// destinations and `widgetURL` can only carry one.
  private func liveBlock(_ pair: FixtureEntry.LivePair) -> some View {
    let minute = Ledger.minuteText(pair, copy: entry.copy, at: entry.date, stale: entry.liveStale)

    return Link(destination: W.url(pair.row) ?? URL(string: "altagamafc://")!) {
      HStack(spacing: 12) {
        LedgerRows(pair: pair, copy: entry.copy, crestSize: 24, nameSize: 14, scoreSize: 22)

        Rectangle()
          .fill(Tok.hairline)
          .frame(width: 1)

        VStack(alignment: .trailing, spacing: 2) {
          if let minute {
            Text(minute.text)
              .font(Tok.numerals(18, .heavy))
              .foregroundStyle(minute.color)
              .lineLimit(1)
          } else {
            W.eyebrow(entry.copy.liveLabel, color: Tok.live, size: 10)
          }
          Spacer(minLength: 0)
          if let note = Ledger.footnote(pair) {
            Text(note)
              .font(.system(size: 11, weight: .medium).monospacedDigit())
              .foregroundStyle(Tok.ink55)
              .multilineTextAlignment(.trailing)
              .lineLimit(2)
              .minimumScaleFactor(0.8)
          }
        }
        .frame(width: 96)
      }
      .padding(.vertical, 6)
      .fixedSize(horizontal: false, vertical: true)
    }
  }

  /// ⚠ **`Link` per row, never one `widgetURL` on the body.** A medium widget
  /// with three clubs on it has three destinations, and `widgetURL` can only
  /// carry one — the two together are a documented conflict where the row taps
  /// silently lose. The small widget has exactly one fixture, so it uses
  /// `widgetURL` instead.
  ///
  /// **Both sides named, home first, the followed one lit and tagged** (ADR
  /// 0059). The first cut drew only the followed crest and `at Girona`, which
  /// made the reader infer their own club from a crest and a preposition. Home
  /// is always on the left — the same rule `W.pairLabel` states — so the followed
  /// club can land on either side, and the accent name plus the `HOME`/`AWAY`
  /// pill are what say which end is yours.
  ///
  /// ⚠ Unlike ADR 0043's upcoming cards, marking the followed side here is
  /// correct: those cards ALL involve a followed club, so a mark would light
  /// every card; this widget is a per-club list, and the mark is its point.
  private func fixtureRow(_ row: WidgetSnapshot.Entry) -> some View {
    Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      HStack(spacing: 8) {
        side(row, slot: "home", followed: row.isHome)

        Text(entry.copy.versus)
          .font(Tok.micro(9))
          .foregroundStyle(Tok.ink45)
          .fixedSize()

        side(row, slot: "away", followed: !row.isHome)

        Spacer(minLength: 6)

        kickoff(row)
      }
      .padding(.vertical, 5)
    }
  }

  /// One side of the fixture: crest, name, and the pill if it is the reader's.
  ///
  /// ⚠ The pill is `fixedSize()` and the NAME carries `minimumScaleFactor` — on
  /// an SE the row is ~300pt for two crests, two names, a pill and a two-line
  /// kickoff, and the thing that gives way must be the name, never the tag
  /// that says which side is yours.
  ///
  /// ⚠ `homeName`/`awayName` are nil on a v1 snapshot; the abbr is the fallback,
  /// never a blank.
  private func side(_ row: WidgetSnapshot.Entry, slot: String, followed: Bool) -> some View {
    let isHome = slot == "home"
    let abbr = isHome ? row.homeAbbr : row.awayAbbr
    let name = (isHome ? row.homeName : row.awayName) ?? abbr
    let tag = isHome ? entry.copy.homeTag : entry.copy.awayTag

    return HStack(spacing: 6) {
      CrestView(fixtureId: row.fixtureId, slot: slot, abbr: abbr, size: 22)

      Text(name)
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(followed ? Tok.accent : Tok.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.7)

      if followed, let tag {
        pill(tag)
      }
    }
    // ⚠ On the SIDE, not on the name. The width fight is between the two sides
    // in the row's outer HStack; a priority on the inner Text only competes with
    // its own crest and pill and changes nothing — the first simulator run drew
    // `Real Mad…` beside a full-width `Málaga`, the inverse of the mock. With the
    // followed side prioritised the OPPONENT is what gives way.
    .layoutPriority(followed ? 1 : 0)
  }

  /// `HOME` / `AWAY` — theme.ts's `accentWash` + `accentRing` capsule, the
  /// same one `versus-badge.tsx` draws in the app.
  private func pill(_ text: String) -> some View {
    Text(text)
      .font(Tok.micro(8))
      .tracking(0.8)
      .foregroundStyle(Tok.accent)
      .padding(.horizontal, 5)
      .padding(.vertical, 2)
      .background(Capsule().fill(Tok.accentWash))
      .overlay(Capsule().strokeBorder(Tok.accentRing, lineWidth: 1))
      .fixedSize()
  }

  /// `SAT` over `21:00`, right-aligned — or the v1 `Sat 21:00` on one line
  /// when the snapshot predates the split.
  @ViewBuilder
  private func kickoff(_ row: WidgetSnapshot.Entry) -> some View {
    if let day = row.kickoffDay, let time = row.kickoffTime {
      VStack(alignment: .trailing, spacing: 0) {
        W.eyebrow(day, color: Tok.ink45, size: 10)
        Text(time)
          .font(Tok.numerals(18, .heavy))
          .foregroundStyle(Tok.ink)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      .fixedSize()
    } else {
      Text(row.kickoffLabel)
        .font(Tok.numerals(14, .semibold))
        .foregroundStyle(Tok.ink78)
        .lineLimit(1)
    }
  }
}
