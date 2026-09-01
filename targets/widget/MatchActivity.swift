import ActivityKit
import SwiftUI
import WidgetKit

/// The match Live Activity — Lock Screen and Dynamic Island (ADR 0055, 0085).
///
/// ⚠⚠ **iOS 18, and the gate is here rather than on the target.**
/// `expo-target.config.js` stays at `deploymentTarget: '17.0'` on purpose:
/// raising it to 18 for this file would silently drop the home-screen and Lock
/// Screen WIDGETS for every iOS 17 reader, which is the exact cost ADR 0047 paid
/// 17.0 to avoid. ⚠ `.claude/LIVE-ACTIVITIES.md` and ADR 0054 both say to raise
/// the floor — that is wrong, and 0055 corrects it.
///
/// ⚠ **This target never STARTS an activity.** The server push-to-starts it and
/// publishes every update to a broadcast channel. There is no `Activity.request`
/// anywhere in this repo, and adding one would only serve a reader already
/// looking at the match.
///
/// ⚠⚠ **The card is drawn from `handoff_alerts-redo/` (ADR 0085), NOT from that
/// folder's `BroadcastActivity.swift`.** That file is a design artifact: it
/// declares a second, incompatible `MatchAttributes`, fetches crests with
/// `AsyncImage` (no network in this process), and loads `Image("goal-glyph")`
/// from an asset catalog no target has. The geometry and colour are its; the
/// mechanisms are this repo's.
@available(iOS 18.0, *)
struct MatchActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: MatchAttributes.self) { context in
      LockScreenCard(attributes: context.attributes, state: context.state)
        // ⚠ The card is drawn on the reader's own wallpaper. Without an explicit
        // ground the tokens sit on whatever is behind them and the type loses
        // contrast against a light photo.
        //
        // ⚠⚠ **This, and NOT a `RoundedRectangle` of our own.** The system draws
        // and rounds the activity's container; clipping to a second 26pt corner
        // inside it double-rounds every edge. The handoff's Swift does exactly
        // that, and it is the one place its drawing cannot be copied.
        .activityBackgroundTint(Tok.activityGround)
        .activitySystemActionForegroundColor(Tok.accent)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          IslandSide(
            fixtureId: context.attributes.fixtureId,
            slot: "home",
            abbr: context.attributes.homeAbbr,
            goals: context.state.homeGoals
          )
        }
        DynamicIslandExpandedRegion(.trailing) {
          IslandSide(
            fixtureId: context.attributes.fixtureId,
            slot: "away",
            abbr: context.attributes.awayAbbr,
            goals: context.state.awayGoals
          )
        }
        DynamicIslandExpandedRegion(.center) {
          Clock(state: context.state, size: 15)
        }
        DynamicIslandExpandedRegion(.bottom) {
          // ⚠ `lastMoment` survives 0085 for THIS region alone. The Lock Screen
          // replaced it with the scorer columns, which do not fit here — the
          // island's bottom region is one line.
          if let moment = context.state.lastMoment {
            MomentLine(moment: moment)
          }
        }
      } compactLeading: {
        CrestView(
          fixtureId: context.attributes.fixtureId,
          slot: "home",
          abbr: context.attributes.homeAbbr,
          size: 18
        )
      } compactTrailing: {
        ScoreLine(state: context.state, size: 15)
      } minimal: {
        ScoreLine(state: context.state, size: 13)
      }
      // ⚠ Tapping any region opens the club, not the app root — the same
      // `altagamafc://club/{slug}` contract `routing.ts` already resolves.
      .widgetURL(URL(string: "altagamafc://club/\(context.attributes.homeSlug)"))
      .keylineTint(Tok.accent)
    }
  }
}

// MARK: - Lock Screen

/// One card, two states — the design's whole structure (ADR 0085).
///
/// ⚠⚠ **The state switch is `clockFromEpoch` and `phase`, NEVER a nil score.**
/// A not-started match reporting 0–0 is real observed provider behaviour, which
/// is why `LiveMatchState` documents absent-is-not-zero — reading the score to
/// decide the layout draws every pre-match card as a goalless draw.
@available(iOS 18.0, *)
private struct LockScreenCard: View {
  let attributes: MatchAttributes
  let state: MatchAttributes.ContentState

  /// True once the whistle has gone, including at half time and full time.
  ///
  /// ⚠ `phase` is a `String` on purpose — a phase the backend grows later must
  /// degrade to "draw the live layout", never to a decode failure. So this asks
  /// what the phase is NOT, rather than listing what it is.
  private var isLive: Bool { state.phase != "scheduled" }

  var body: some View {
    VStack(spacing: Geometry.stack) {
      eyebrow
      fixture
      if isLive {
        band
        ClockBar(state: state)
      }
    }
    .padding(EdgeInsets(top: 13, leading: 16, bottom: 15, trailing: 16))
    .frame(maxWidth: .infinity)
    .background(floodlights)
  }

  /// Two unequal lime radials from the top corners over a deep green pool.
  ///
  /// ⚠ **34% and 30%, and the asymmetry is the point** — the card reads as *lit*
  /// rather than branded, and neither club owns the warm side.
  ///
  /// ⚠⚠ **`EllipticalGradient`, not `RadialGradient`.** The design's
  /// `radial-gradient(78% 120% at 0% 0%, …)` is an ellipse taller than it is
  /// wide; SwiftUI's `RadialGradient` is strictly circular and cannot express it.
  /// The handoff's Swift uses the circular one with a hard-coded `endRadius`,
  /// which lands nowhere near the mock at any card width.
  private var floodlights: some View {
    ZStack {
      EllipticalGradient(
        colors: [Tok.accent.opacity(0.34), Tok.activityGround.opacity(0)],
        center: .topLeading,
        startRadiusFraction: 0,
        endRadiusFraction: 0.58
      )
      EllipticalGradient(
        colors: [Tok.accent.opacity(0.30), Tok.activityGround.opacity(0)],
        center: .topTrailing,
        startRadiusFraction: 0,
        endRadiusFraction: 0.58
      )
      // ⚠ Below the crests, and that is its whole job — the two radials above
      // fall onto exactly where the badges sit, and this keeps a green cast off
      // club artwork we do not own.
      EllipticalGradient(
        colors: [Tok.activityPool.opacity(0.85), Tok.activityGround.opacity(0)],
        center: UnitPoint(x: 0.5, y: 1.18),
        startRadiusFraction: 0,
        endRadiusFraction: 0.70
      )
    }
  }

  // MARK: eyebrow

  /// Live: a pulsing dot, the minute, the venue and the short matchday.
  /// Pre-match: the competition and the long matchday.
  ///
  /// ⚠ Every segment is dropped rather than defaulted, and the separators are
  /// drawn BETWEEN what survives — `venue` has always been nullable and the two
  /// matchday forms are too. A bare `·` with nothing after it is the failure
  /// this shape exists to avoid.
  private var eyebrow: some View {
    HStack(spacing: 8) {
      if isLive {
        LiveDot()
        Clock(state: state, size: 11)
        Separated(segments: [attributes.venue, attributes.matchdayShort])
      } else {
        Separated(segments: [attributes.competition, attributes.matchday])
      }
    }
  }

  // MARK: the fixture row

  private var fixture: some View {
    HStack(spacing: 10) {
      crest("home", attributes.homeAbbr)
      side(
        abbr: attributes.homeAbbr,
        tag: attributes.homeTag,
        record: attributes.homeRecord,
        pts: attributes.homePts,
        dimmed: false
      )
      centre
      side(
        abbr: attributes.awayAbbr,
        tag: attributes.awayTag,
        record: attributes.awayRecord,
        pts: attributes.awayPts,
        // ⚠ The away ABBREVIATION dims only while live, matching the away score
        // beside it. Before kick-off neither side is behind.
        dimmed: isLive
      )
      crest("away", attributes.awayAbbr)
    }
  }

  /// ⚠ `showsAbbr: false` — this row already prints the abbreviation at 30pt,
  /// and the fallback tile printing it too is the `ATH ATH` doubling logged in
  /// HANDOFF item 5.
  private func crest(_ slot: String, _ abbr: String) -> some View {
    CrestView(
      fixtureId: attributes.fixtureId,
      slot: slot,
      abbr: abbr,
      size: Geometry.crest,
      showsAbbr: false
    )
  }

  /// ⚠⚠ **`tag` arrives on the wire; it is NOT derived by comparing
  /// abbreviations.** Two clubs can share a three-letter code, and the handoff's
  /// `side.abbr == state.home.abbr` labels both sides HOME in that fixture. It is
  /// also a WORD, so the server owns its language.
  private func side(
    abbr: String,
    tag: String?,
    record: String?,
    pts: Int?,
    dimmed: Bool
  ) -> some View {
    VStack(spacing: 4) {
      Text(abbr)
        .font(.system(size: 30, weight: .heavy))
        .kerning(-0.6)
        .foregroundStyle(dimmed ? Tok.ink78 : Tok.ink)
        .lineLimit(1)
        .minimumScaleFactor(0.8)

      if isLive {
        if let tag {
          Text(tag)
            .font(.system(size: 11.5, weight: .medium))
            .foregroundStyle(Tok.ink60)
        }
      } else if let record {
        // ⚠ Absent rather than `0-0-0` when the standings view cannot answer —
        // the server nulls it, and the line simply does not draw.
        Text(record)
          .font(.system(size: 11.5, weight: .medium))
          .monospacedDigit()
          .foregroundStyle(Tok.ink60)
        if let pts, let label = attributes.ptsLabel {
          Text("\(pts) \(label)")
            .font(.system(size: 11.5, weight: .medium))
            .monospacedDigit()
            .foregroundStyle(Tok.ink60)
        }
      }
    }
    .frame(maxWidth: .infinity)
  }

  /// The score, or the mark over the kickoff time.
  @ViewBuilder private var centre: some View {
    if isLive {
      HStack(spacing: 11) {
        ScoreDigit(goals: state.homeGoals, dim: false)
        Rectangle().fill(Tok.ink32).frame(width: 9, height: 1.5)
        // ⚠ The away digit at 58%. Unlike ADR 0044's `Score` atom this is NOT
        // "dim the loser" — it is a fixed side treatment, so the card reads the
        // same whoever is ahead.
        ScoreDigit(goals: state.awayGoals, dim: true)
      }
    } else {
      VStack(spacing: 7) {
        // ⚠ `Mark`, the SwiftUI transcription — there is no asset catalog to
        // load `mark-accent.svg` from, and a PNG flattens under Lock Screen
        // tinting.
        Mark(size: 19)
        // ⚠ Drawn from `kickoffEpoch` in the DEVICE's locale rather than from a
        // pre-formatted string. A clock time is the one thing on this card the
        // reader's own settings should decide — 15:30 against 3:30 PM — and it
        // is the one string that needs no language to be right.
        Text(attributes.kickoffUtc, style: .time)
          .font(.system(size: 21, weight: .semibold))
          .kerning(-0.4)
          .monospacedDigit()
          .foregroundStyle(Tok.ink)
      }
    }
  }

  // MARK: the scorer band

  /// Mirrored inward: home is glyph-first, away is name-first, so the side of
  /// every goal reads without a label.
  private var band: some View {
    VStack(spacing: 0) {
      Rectangle().fill(Tok.activityHairline).frame(height: 0.5)
      HStack(alignment: .top, spacing: 10) {
        ScorerColumn(
          scorers: state.homeScorers ?? [],
          more: state.homeMoreGoals,
          cards: state.homeCards,
          side: .leading
        )
        Rectangle().fill(Tok.activityHairline).frame(width: 0.5)
        ScorerColumn(
          scorers: state.awayScorers ?? [],
          more: state.awayMoreGoals,
          cards: state.awayCards,
          side: .trailing
        )
      }
      .padding(.top, Geometry.bandTop)
    }
  }
}

// MARK: - Geometry

/// The numbers `BROADCAST-WIDGET.md` names, and the two the measurement moved.
///
/// ⚠⚠ **Apple caps the Lock Screen presentation at ~160pt, and the design as
/// handed over measures 203.5pt in its live state.** ADR 0085 carries the full
/// table; the short version is that the band went to ONE line per column and
/// these two gaps each lost 2pt, which lands the live card at 152.5pt with 7pt
/// to spare. Pre-match measures 121pt and was never at risk.
///
/// ⚠ **`crest` is NOT what gives.** The obvious trim — 46 → 40 — saves exactly
/// nothing: the crest never binds the fixture row's height, because the
/// abbreviation-and-tag column beside it is 53.5pt. Shrinking it costs design
/// fidelity for no height at all, which is precisely the kind of thing measuring
/// first is for.
@available(iOS 18.0, *)
private enum Geometry {
  static let crest: CGFloat = 46
  /// ⚠ 10, not the design's 12 — see above.
  static let stack: CGFloat = 10
  /// ⚠ 9, not the design's 11 — see above.
  static let bandTop: CGFloat = 9
}

// MARK: - Pieces

/// The live marker: a 5pt lime dot that breathes.
///
/// ⚠ **One of only two things that move between pushes**, the clock bar being
/// the other. Everything else on this card changes when a push arrives and not
/// otherwise, which is the entire budget rule.
@available(iOS 18.0, *)
private struct LiveDot: View {
  @State private var dim = false

  var body: some View {
    Circle()
      .fill(Tok.accent)
      .frame(width: 5, height: 5)
      .opacity(dim ? 0.35 : 1)
      .animation(
        .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
        value: dim
      )
      // ⚠ Set in `onAppear`, not at init. A `@State` that already holds its
      // final value when the animation is attached never transitions, which is
      // why the handoff's `Pulse` modifier does not actually pulse.
      .onAppear { dim = true }
  }
}

/// Segments joined by a 3pt dot, skipping whatever is nil.
///
/// ⚠ The separator is drawn BETWEEN survivors rather than after each segment —
/// the difference between `SAN MAMÉS · J4` and `SAN MAMÉS ·` on a fixture whose
/// matchweek the ingest never wrote.
@available(iOS 18.0, *)
private struct Separated: View {
  let segments: [String?]

  var body: some View {
    let present = segments.compactMap { $0 }.filter { !$0.isEmpty }
    HStack(spacing: 8) {
      ForEach(Array(present.enumerated()), id: \.offset) { index, text in
        if index > 0 {
          Circle().fill(Tok.ink34).frame(width: 3, height: 3)
        }
        Text(text)
          .font(.system(size: 11.5, weight: .medium))
          .kerning(0.2)
          .foregroundStyle(Tok.ink62)
          .lineLimit(1)
      }
    }
  }
}

/// One side's goals. ⚠ `–` for "not reported", never 0.
@available(iOS 18.0, *)
private struct ScoreDigit: View {
  let goals: Int?
  let dim: Bool

  var body: some View {
    Text(goals.map(String.init) ?? "–")
      .font(.system(size: 34, weight: .bold))
      .kerning(-1)
      .monospacedDigit()
      .foregroundStyle(dim ? Tok.ink58 : Tok.ink)
  }
}

/// One column: a single line carrying the goal, the overflow and the bookings.
///
/// ⚠⚠ **ONE row, and the number was measured rather than chosen.** The design
/// draws up to three scorer rows a side; at ~160pt of Lock Screen every
/// arrangement that stacks even two lands at 159.5pt with no margin at all,
/// which on a real device clips the clock bar. One line measures 152.5pt and
/// keeps the 46pt crests, the 30pt abbreviations and the HOME/AWAY tags that the
/// alternatives spend. ADR 0085 has the table.
///
/// ⚠ So `+n` and the pills are INLINE. A `+n` on its own row costs exactly what
/// a second scorer costs — 172.5pt measured — which would have made the whole
/// trim pointless.
///
/// ⚠ The server names the first scorer and counts the rest; this view never
/// slices. See `ACTIVITY_SCORER_LIMIT`.
@available(iOS 18.0, *)
private struct ScorerColumn: View {
  let scorers: [MatchAttributes.Scorer]
  let more: Int?
  let cards: MatchAttributes.Discipline?
  let side: HorizontalAlignment

  private var trailing: Bool { side == .trailing }

  var body: some View {
    // ⚠⚠ **No `Spacer` here, and that is not a style choice.** A `Spacer` has the
    // default layout priority; `label` is deliberately BELOW it, so the spacer
    // would be handed the column's slack before the name got any and the name
    // would truncate on a row with room to spare. The frame's alignment does the
    // same job without competing for width.
    HStack(spacing: 7) {
      // ⚠ Home is glyph-first, away is name-first — mirrored inward, so the side
      // of the goal reads without a label. The away glyph is flipped so its
      // off-centre ball still hugs the name; see `GoalGlyph`.
      //
      // ⚠ Both columns pack toward their OWN crest, which puts the discipline
      // pills innermost on each side. That keeps every element in a column under
      // the badge it belongs to — the attribution the mirroring exists for.
      if trailing {
        pills
        overflow
        label
        GoalGlyph(opacity: 0.5, flipped: true)
      } else {
        goal
        label
        overflow
        pills
      }
    }
    .frame(maxWidth: .infinity, alignment: trailing ? .trailing : .leading)
  }

  /// ⚠ Drawn only on the leading side; the trailing side draws its own flipped
  /// glyph in the mirrored order above.
  @ViewBuilder private var goal: some View {
    if !scorers.isEmpty { GoalGlyph(opacity: 1) }
  }

  @ViewBuilder private var label: some View {
    if let scorer = scorers.first {
      ScorerLabel(scorer: scorer, trailing: trailing)
        // ⚠ The name is the first thing to give when the row runs out of width,
        // because the pills and the `+n` are counts and a truncated count is
        // WRONG where a truncated name is merely shorter.
        .layoutPriority(-1)
    }
  }

  @ViewBuilder private var overflow: some View {
    if let more, more > 0 {
      Text("+\(more)")
        .font(.system(size: 12, weight: .semibold))
        .monospacedDigit()
        .foregroundStyle(Tok.ink60)
        .fixedSize()
    }
  }

  @ViewBuilder private var pills: some View {
    if let cards {
      DisciplinePills(cards: cards, trailing: trailing)
        .fixedSize()
    }
  }
}

/// `Guruzeta 23'` — the name at full weight, the minute behind it.
///
/// ⚠⚠ **Neither part is derived here.** The name arrived truncated and, on an
/// own goal, already marked; the minute arrived in football notation. See
/// `MatchAttributes.Scorer` for why the widget cannot do either itself.
@available(iOS 18.0, *)
private struct ScorerLabel: View {
  let scorer: MatchAttributes.Scorer
  let trailing: Bool

  var body: some View {
    (
      Text(scorer.name)
        .font(.system(size: 12, weight: .semibold))
        .foregroundColor(Tok.ink90)
      // ⚠ The space is inside the conditional. A goal whose minute the feed
      // omitted travels as an empty label, and a trailing space would push the
      // name off its own alignment.
      + Text(scorer.minuteLabel.isEmpty ? "" : " \(scorer.minuteLabel)")
        .font(.system(size: 12, weight: .regular))
        .foregroundColor(Tok.ink60)
    )
    .kerning(-0.12)
    .monospacedDigit()
    .lineLimit(1)
    .multilineTextAlignment(trailing ? .trailing : .leading)
  }
}

/// Yellow in amber, a red in coral, count-first on the away side.
@available(iOS 18.0, *)
private struct DisciplinePills: View {
  let cards: MatchAttributes.Discipline
  let trailing: Bool

  var body: some View {
    HStack(spacing: 9) {
      if cards.yellow > 0 {
        pill(count: cards.yellow, chip: Tok.cardYellow, ink: Tok.ink55)
      }
      if cards.red > 0 {
        pill(count: cards.red, chip: Tok.cardRed, ink: Tok.redInk)
      }
    }
  }

  /// ⚠ Chip-first inbound, count-first outbound — the same mirroring the scorer
  /// rows use, so a pill never reads across the column divider.
  private func pill(count: Int, chip: Color, ink: Color) -> some View {
    HStack(spacing: 6) {
      if trailing {
        countText(count, ink)
        CardChip(color: chip)
      } else {
        CardChip(color: chip)
        countText(count, ink)
      }
    }
  }

  private func countText(_ n: Int, _ ink: Color) -> some View {
    Text("\(n)")
      .font(.system(size: 11, weight: .semibold))
      .monospacedDigit()
      .foregroundStyle(ink)
  }
}

/// The 3pt bar across the foot of the card.
///
/// ⚠⚠ **System-drawn from the clock anchor, and that is what makes it free.**
/// `ProgressView(timerInterval:)` advances on the device's own clock at zero
/// reload cost — the same mechanism ADR 0058 uses for the NEXT widget's
/// countdown. Pushing a per-minute fraction instead is precisely how Apple's
/// update budget is exhausted inside one half.
///
/// ⚠ At half time and full time `clockFrom` is nil, because a running clock is a
/// claim that play is happening. The bar then freezes rather than disappearing —
/// a card whose foot vanishes at the break looks broken.
@available(iOS 18.0, *)
private struct ClockBar: View {
  let state: MatchAttributes.ContentState

  var body: some View {
    Group {
      if let from = state.clockFrom {
        ProgressView(
          timerInterval: from...from.addingTimeInterval(90 * 60),
          countsDown: false
        ) {
          EmptyView()
        } currentValueLabel: {
          EmptyView()
        }
        .progressViewStyle(.linear)
        .tint(Tok.accent)
      } else {
        // ⚠ Full, not empty. The clock stops at half time and at the whistle,
        // and both are further through the match than any running bar — an
        // emptied bar at full time would read as "not started".
        Capsule().fill(Tok.accent)
      }
    }
    .frame(height: 3)
    .background(Capsule().fill(Color.white.opacity(0.12)))
    .clipShape(Capsule())
  }
}

/// One club in the Dynamic Island: crest, three letters, goals.
///
/// ⚠ The losing digit is NOT dimmed here, unlike the Lock Screen's fixed away
/// treatment and unlike the app's `Score` atom (ADR 0044). The island is glanced
/// at from a metre away and no dim tier survives that.
@available(iOS 18.0, *)
private struct IslandSide: View {
  let fixtureId: String
  let slot: String
  let abbr: String
  let goals: Int?

  var body: some View {
    HStack(spacing: 6) {
      // ⚠ `showsAbbr: false` here too — the row prints `abbr` itself.
      CrestView(
        fixtureId: fixtureId,
        slot: slot,
        abbr: abbr,
        size: 22,
        showsAbbr: false
      )
      Text(abbr)
        .font(Tok.micro(12))
        .foregroundStyle(Tok.ink78)
      Text(goals.map(String.init) ?? "–")
        .font(Tok.numerals(20, .bold))
        .foregroundStyle(Tok.ink)
    }
  }
}

/// `1–0`, for the two Dynamic Island slots that have room for nothing else.
@available(iOS 18.0, *)
private struct ScoreLine: View {
  let state: MatchAttributes.ContentState
  let size: CGFloat

  var body: some View {
    Text("\(state.homeGoals.map(String.init) ?? "–")–\(state.awayGoals.map(String.init) ?? "–")")
      .font(Tok.numerals(size, .bold))
      .foregroundStyle(Tok.ink)
  }
}

/// The minute — counted on device while play is running, printed otherwise.
///
/// ⚠⚠ **`clockFrom` is not kickoff.** It is a synthetic instant the server
/// re-anchors on every push so that elapsed-since equals the reported minute; a
/// timer anchored to actual kickoff counts the half-time break and is wrong for
/// the whole second half. See `MatchAttributes.ContentState.clockFrom`.
@available(iOS 18.0, *)
private struct Clock: View {
  let state: MatchAttributes.ContentState
  let size: CGFloat

  var body: some View {
    Group {
      if let from = state.clockFrom {
        // ⚠ `countsDown: false` — this counts UP from the anchor. The upper
        // bound is only a ceiling the view never reaches.
        Text(timerInterval: from...from.addingTimeInterval(60 * 200), countsDown: false)
          .font(Tok.numerals(size, .bold))
          .foregroundStyle(Tok.accent)
      } else {
        Text(state.minuteLabel ?? "")
          .font(Tok.micro(size - 2))
          .foregroundStyle(Tok.ink62)
      }
    }
    .monospacedDigit()
  }
}

/// The last alertable moment — `67' Lewandowski`.
///
/// ⚠ Every string here arrived pre-localised in the push. This target has no
/// `.lproj` and must not grow one — see `MatchAttributes`.
///
/// ⚠ ADR 0085 replaced this on the Lock Screen with the scorer columns. It is
/// kept for the Dynamic Island's bottom region, which is one line tall.
@available(iOS 18.0, *)
private struct MomentLine: View {
  let moment: MatchAttributes.Moment

  var body: some View {
    HStack(spacing: 6) {
      Text(moment.minuteLabel)
        .font(Tok.numerals(11, .bold))
        .foregroundStyle(tint)
      if let player = moment.player, !player.isEmpty {
        Text(player)
          .font(Tok.micro(11))
          .foregroundStyle(Tok.ink78)
          .lineLimit(1)
      }
      if let consequence = moment.consequenceLabel {
        Text(consequence)
          .font(Tok.micro(10))
          .foregroundStyle(Tok.redInk)
          .lineLimit(1)
      }
    }
  }

  /// ⚠ Red only for a sending-off. Accent for a goal, and NEVER for full time —
  /// a finished match is not a moment of drama, it is a result.
  private var tint: Color {
    switch moment.kind {
    case "red-card": return Tok.cardRed
    case "goal": return Tok.accent
    default: return Tok.ink62
    }
  }
}
