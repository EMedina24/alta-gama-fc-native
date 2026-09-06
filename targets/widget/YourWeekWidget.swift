import SwiftUI
import WidgetKit

/// **YOUR WEEK** — the week ahead, medium (ADR 0127, `handoff_widget-redo/`).
///
/// A day SPINE: one vertical timeline in a fixed date gutter, three stops. The
/// next match's stop opens up to hold the kickoff; the rest collapse to a line
/// each. The split-panel hero + glass rail this replaces (ADR 0086/0108/0109)
/// read as two widgets stapled together and truncated club names in the rail.
///
/// ⚠ **Geometry and colour come from the mock CSS ÷2** (`Your Week
/// Widget.dc.html`, drawn at 2× a 338×158 tile) — where the MD token table
/// disagrees on a width, the mock wins. The handoff's own reference Swift is
/// NOT this file's ancestor: it invents snapshot types, draws crests with
/// `AsyncImage` (dead in a widget), and ignores rendering modes.
///
/// ⚠ **The mock's opaque grey inks are transcribed as WHITE-ALPHA over the
/// plate** (`Ink` below, values within ~2 RGB points of the hexes). Under the
/// system's glass the tint is applied white AT THE COLOUR'S OWN OPACITY
/// (ADR 0114) — an opaque `#59626a` would flatten to full white and the
/// tile's whole hierarchy with it.
///
/// ⚠ **`.contentMarginsDisabled()`, and the shell is the CONTAINER
/// background.** The tray's corner is the system's own mask (ADR 0085 §1);
/// content pays the tray's 2pt inset in its padding instead.
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
    // ⚠ Without this the system's ~16pt margins leave the shell floating in a
    // black frame — a card inside a card. Content supplies its own padding.
    .contentMarginsDisabled()
  }
}

// MARK: - Ink

/// The spine's own palette — the mock's greys as white-alpha over `Tok.plate`
/// (`#0b0d0f`), so the hierarchy survives `.accented` (see the header).
/// File-private: these belong to this tile, not to `Tok`'s shared list.
private enum Ink {
  /// Kickoff time — mock `#f4f6f6`.
  static let time = Color.white.opacity(0.96)
  /// Hero club names (the unfollowed side) — mock `#e7ebec`.
  static let club = Color.white.opacity(0.92)
  /// Collapsed fixture line — mock `#dfe4e6`.
  static let restName = Color.white.opacity(0.89)
  /// Collapsed time — mock `#aab3b8`.
  static let restTime = Color.white.opacity(0.68)
  /// Collapsed day code — mock `#8d979d`.
  static let restDay = Color.white.opacity(0.56)
  /// Hero date step — mock `#6b747b`.
  static let date = Color.white.opacity(0.43)
  /// `3 CLUBS` and the collapsed date step — mock `#59626a`.
  static let dim = Color.white.opacity(0.35)
  /// The `v` — mock `#4f575d`.
  static let versus = Color.white.opacity(0.30)
  /// The spine rail's resting colour, and the hero rail's fade-out tail.
  static let rail = Color.white.opacity(0.10)
  /// The collapsed stop's hollow ring.
  static let ring = Color.white.opacity(0.32)
  /// The hairline above each collapsed row — mock `white 7%`.
  static let rowRule = Color.white.opacity(0.07)
}

// MARK: - Geometry

private enum G {
  /// The date gutter — FIXED so the spine stays plumb whatever the labels say.
  static let gutter: CGFloat = 48
  /// The spine's own column; node, ring and rail all centre in it.
  static let spine: CGFloat = 7
  /// Content indent right of the spine.
  static let inset: CGFloat = 9
  /// The opened row's share against 1 per collapsed row (mock `1.34fr/1fr`).
  static let heroShare: CGFloat = 1.34
}

// MARK: - Tile

struct YourWeekView: View {
  let entry: FixtureEntry

  /// The opened stop plus at most two collapsed ones.
  ///
  /// ⚠ **No live ledger here** (ADR 0086's rule, unchanged): `entry.live` and
  /// `entry.liveStale` are for `NextFixtureView`; this tile reads neither. A
  /// match in play is simply absent — `rows(after:)` filters on
  /// `kickoffUtc > now` — and the opened stop becomes the kickoff after it.
  /// The tile says what is COMING.
  private var rows: [WidgetSnapshot.Entry] { Array(entry.rows.prefix(3)) }
  private var hero: WidgetSnapshot.Entry? { rows.first }
  private var collapsed: [WidgetSnapshot.Entry] { Array(rows.dropFirst()) }

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header

      if hero != nil {
        // ⚠ A `layoutPriority` cannot express a ratio — it decides who gets
        // its ideal size first, not how the slack is split — so the row bands
        // are measured off the geometry: hero 1.34 shares, each collapsed row
        // 1, of whatever height this tile actually has. Fewer fixtures mean
        // fewer terms, so the spine self-degrades: two rows split 1.34:1, one
        // row hands the whole area to the opened stop.
        GeometryReader { geo in
          let unit = geo.size.height / (G.heroShare + CGFloat(collapsed.count))
          VStack(spacing: 0) {
            if let hero {
              // ⚠ `compact` is a MEASUREMENT, not a device check (0108's
              // idiom): the full form is 44.0pt on the harness — under a
              // 46.9pt band on a standard tile and 45.7 on a mini, but over
              // the SE's 42.9 and a zoomed SE's 40.1, where the compact cut
              // (20pt time, 4pt gap) measures 39.0. Only three stops on a
              // small tile ever take it; one or two stops leave the opened
              // row more band than either form needs.
              heroRow(hero, showsRail: !collapsed.isEmpty, compact: unit * G.heroShare < 44)
                .frame(height: unit * G.heroShare, alignment: .top)
            }
            ForEach(collapsed) { row in
              collapsedRow(row)
                .frame(height: unit)
                // ⚠ An OVERLAY, not a stacked Rectangle: the hairline must
                // cost no height or the measured bands drift off the ratio.
                .overlay(alignment: .top) {
                  Rectangle().fill(Ink.rowRule).frame(height: 0.5)
                }
            }
          }
        }
        .padding(.top, 4)
      } else {
        // ⚠ Two different sentences for two different situations — follow a
        // club, or wait for the fixtures to be published.
        EmptyState(copy: entry.copy, followsNothing: entry.followsNothing)
          .padding(.top, 10)
      }
    }
    // The handoff's 10/13/8 plate padding PLUS the tray's 2pt inset — content
    // is laid out from the tile's edge, not the plate's.
    .padding(EdgeInsets(top: 12, leading: 15, bottom: 10, trailing: 15))
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  // MARK: Header

  /// ⚠ The lime capsule around YOUR WEEK is GONE (0127) — plain tracked lime,
  /// the mock's header. `.widgetAccentable()` on the lime voice only
  /// (ADR 0114): mark and wordmark tint together, the count stays quiet.
  private var header: some View {
    HStack(spacing: 6) {
      Mark(size: 11)
        .opacity(0.92)
        .widgetAccentable()
      Text(entry.copy.yourWeek)
        .font(.system(size: 8.5, weight: .bold))
        .tracking(1.7)
        .foregroundStyle(Tok.accent)
        .widgetAccentable()
        .lineLimit(1)
      Spacer(minLength: 4)
      Text(entry.copy.clubCount)
        .font(.system(size: 8.5, weight: .medium))
        .tracking(1.2)
        .foregroundStyle(Ink.dim)
        .lineLimit(1)
    }
    .frame(height: 15)
  }

  // MARK: The opened stop

  /// ⚠ A `Link`, never `widgetURL` — three stops are three destinations and
  /// `widgetURL` carries one; the two together are a documented conflict where
  /// the row taps silently lose. (The handoff's "one tap target" note was
  /// overridden by Ed — ADR 0127.)
  private func heroRow(_ row: WidgetSnapshot.Entry, showsRail: Bool, compact: Bool) -> some View {
    let timeSize: CGFloat = compact ? 20 : 23

    return Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      HStack(alignment: .top, spacing: 0) {
        VStack(alignment: .trailing, spacing: 3) {
          // ⚠ `kickoffDay` is optional only for a pre-v2 file; absence drops
          // the label, and the time below falls back to the dated
          // `kickoffLabel` — never a blank stop.
          if let day = row.kickoffDay {
            Text(day)
              .font(.system(size: 8.5, weight: .bold))
              .tracking(1.4)
              .foregroundStyle(Tok.accent)
              .widgetAccentable()
          }
          // ⚠ Hidden when nil (a v5 file): `kickoffDayDate` is NOT a fallback
          // here — `SÁB` over `Sáb 5` says the weekday twice in one gutter.
          if let date = row.kickoffDateLabel {
            Text(date)
              .font(.system(size: 7.5, weight: .medium))
              .tracking(0.45)
              .foregroundStyle(Ink.date)
          }
        }
        .frame(width: G.gutter, alignment: .trailing)
        .padding(.top, 4)

        heroSpine(showsRail: showsRail)

        VStack(alignment: .leading, spacing: compact ? 4 : 6) {
          HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(row.kickoffTime ?? row.kickoffLabel)
              .font(Tok.numerals(timeSize, .ultraLight))
              .tracking(-0.8)
              .foregroundStyle(Ink.time)
              .lineLimit(1)

            if let tag = row.isHome ? entry.copy.homeTag : entry.copy.awayTag {
              Text(tag)
                .font(.system(size: 7.5, weight: .bold))
                .tracking(1.05)
                .foregroundStyle(Tok.accent)
                .padding(.horizontal, 5)
                .frame(height: 13)
                // ⚠ r4 stays r4: at 13pt tall a `Rad.chip` corner is a pill.
                .background(
                  RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .fill(Tok.accent.opacity(0.12))
                )
                .overlay(
                  RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .strokeBorder(Tok.accent.opacity(0.28), lineWidth: 0.5)
                )
                .fixedSize()
                // ⚠ ONE group — text, wash and ring tint together, or the
                // pill's fill and its type drift into two colours (ADR 0114).
                .widgetAccentable()
            }
          }
          // ⚠ The mock's `line-height: 1` as a frame: SwiftUI's own line box
          // for 23pt SF is ~27.5pt, and those 4.5 phantom points are what
          // overflowed the 1.34 band on the harness. Digits have no
          // descenders; nothing is clipped.
          .frame(height: timeSize)

          // ⚠ Home first, always — the same rule `W.pairLabel` states.
          // ⚠ ONE row, where 0086 stacked. The stacking constraint died with
          // the split panel: this column is ~244pt (227 on an SE) and the
          // worst realistic pair (`R. Sociedad` v `Villarreal`) draws ~158pt
          // at these sizes.
          HStack(spacing: 5) {
            CrestView(fixtureId: row.fixtureId, slot: "home", abbr: row.homeAbbr, size: 15, tone: .open)
            heroName(row.homeName ?? row.homeAbbr, followed: row.isHome)
            Text(entry.copy.versus)
              .font(.system(size: 8))
              .foregroundStyle(Ink.versus)
            CrestView(fixtureId: row.fixtureId, slot: "away", abbr: row.awayAbbr, size: 15, tone: .open)
            heroName(row.awayName ?? row.awayAbbr, followed: !row.isHome)
          }
        }
        .padding(.leading, G.inset)

        Spacer(minLength: 0)
      }
    }
  }

  /// ⚠ `homeName`/`awayName` are nil on a v1 snapshot; the abbr is the
  /// fallback, never a blank.
  private func heroName(_ text: String, followed: Bool) -> some View {
    Text(text)
      .font(.system(size: 10.5, weight: .semibold))
      .tracking(-0.21)
      .foregroundStyle(followed ? Tok.accent : Ink.club)
      // ⚠ Conditional, mirroring the lime: the followed side keeps its
      // distinction through the accent group on the system's glass (ADR 0114).
      .widgetAccentable(followed)
      .lineLimit(1)
      // ⚠ 0.81, not lower — the design's floor on device is 8.5pt and
      // 10.5 × 0.81 is exactly that. Measured, this never engages.
      .minimumScaleFactor(0.81)
  }

  /// The opened stop's spine: a solid lime node under a 2pt halo, rail fading
  /// lime → `rail` below it. Node, halo and rail are ONE accent group — the
  /// spine's lime is the "next" voice and must survive the tint (ADR 0114).
  ///
  /// ⚠ Spine colour carries the state, and the state is only WHICH STOP IS
  /// NEXT — a fact of the schedule, not of the clock. Liveness never (the old
  /// `Plate` rule).
  private func heroSpine(showsRail: Bool) -> some View {
    ZStack(alignment: .top) {
      if showsRail {
        LinearGradient(
          colors: [Tok.accent.opacity(0.75), Ink.rail],
          startPoint: .top,
          endPoint: .bottom
        )
        .frame(width: 1)
        .padding(.top, 8)
      }
      // The halo: a 2pt stroke centred on a 9pt circle spans r3.5→5.5 — the
      // mock's `box-shadow` spread exactly. Stroke overflow costs no layout.
      ZStack {
        Circle()
          .stroke(Tok.accent.opacity(0.16), lineWidth: 2)
          .frame(width: 9, height: 9)
        Circle()
          .fill(Tok.accent)
          .frame(width: 7, height: 7)
      }
      .padding(.top, 3)
    }
    .widgetAccentable()
    .frame(width: G.spine)
    .frame(maxHeight: .infinity, alignment: .top)
  }

  // MARK: Collapsed stops

  /// ⚠ A `Link` like the opened stop — every row is its own destination.
  private func collapsedRow(_ row: WidgetSnapshot.Entry) -> some View {
    Link(destination: W.url(row) ?? URL(string: "altagamafc://")!) {
      HStack(spacing: 0) {
        VStack(alignment: .trailing, spacing: 2.5) {
          if let day = row.kickoffDay {
            Text(day)
              .font(.system(size: 8, weight: .semibold))
              .tracking(1.3)
              .foregroundStyle(Ink.restDay)
          }
          // ⚠ 7pt — the design's ONE step under its 8.5 floor, accepted by
          // the handoff for this date alone. Nothing else may join it.
          if let date = row.kickoffDateLabel {
            Text(date)
              .font(.system(size: 7, weight: .medium))
              .tracking(0.42)
              .foregroundStyle(Ink.dim)
          }
        }
        .frame(width: G.gutter, alignment: .trailing)

        collapsedSpine

        HStack(spacing: 6) {
          // Butted 1pt apart: at 12pt the pair reads as one object — the
          // fixture — rather than as two badges with something missing
          // between them.
          HStack(spacing: 1) {
            CrestView(fixtureId: row.fixtureId, slot: "home", abbr: row.homeAbbr, size: 12, tone: .open)
            CrestView(fixtureId: row.fixtureId, slot: "away", abbr: row.awayAbbr, size: 12, tone: .open)
          }
          // ⚠ Truncates rather than shrinks (0086's rule, still the floor
          // here): 9pt has no scale factor that stays legible, a shorter name
          // is a fair loss, and the time beside it is a NUMBER, which must
          // never give.
          Text("\(row.homeName ?? row.homeAbbr) \(entry.copy.versus) \(row.awayName ?? row.awayAbbr)")
            .font(.system(size: 9, weight: .semibold))
            .tracking(-0.14)
            .foregroundStyle(Ink.restName)
            .lineLimit(1)
          Spacer(minLength: 2)
          Text(row.kickoffTime ?? row.kickoffLabel)
            .font(Tok.numerals(10, .medium))
            .tracking(-0.2)
            .foregroundStyle(Ink.restTime)
            .lineLimit(1)
            .fixedSize()
        }
        .padding(.leading, G.inset)
      }
    }
  }

  /// A collapsed stop: flat rail, hollow 5pt ring centred on it.
  ///
  /// ⚠⚠ **The rail is TWO segments and the ring's fill is CLEAR, deliberately
  /// — not the mock's plate-filled dot over a through rail.** The looks are
  /// identical in fullColor, but under the system's tint a near-black fill
  /// INVERTS to a solid bright dot (trap 60); splitting the rail needs no
  /// fill, no mode branch, and nothing that can bloom.
  private var collapsedSpine: some View {
    ZStack {
      VStack(spacing: 5) {
        Rectangle().fill(Ink.rail).frame(width: 1).frame(maxHeight: .infinity)
        Rectangle().fill(Ink.rail).frame(width: 1).frame(maxHeight: .infinity)
      }
      Circle()
        .strokeBorder(Ink.ring, lineWidth: 1)
        .frame(width: 5, height: 5)
    }
    .frame(width: G.spine)
    .frame(maxHeight: .infinity)
  }
}
