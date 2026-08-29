import ActivityKit
import SwiftUI
import WidgetKit

/// The match Live Activity — Lock Screen and Dynamic Island (ADR 0055).
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
@available(iOS 18.0, *)
struct MatchActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: MatchAttributes.self) { context in
      LockScreenCard(attributes: context.attributes, state: context.state)
        // ⚠ The card is drawn on the reader's own wallpaper. Without an explicit
        // ground the tokens sit on whatever is behind them and the type loses
        // contrast against a light photo.
        .activityBackgroundTint(Tok.ground)
        .activitySystemActionForegroundColor(Tok.accent)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Side(
            fixtureId: context.attributes.fixtureId,
            slot: "home",
            abbr: context.attributes.homeAbbr,
            goals: context.state.homeGoals
          )
        }
        DynamicIslandExpandedRegion(.trailing) {
          Side(
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

@available(iOS 18.0, *)
private struct LockScreenCard: View {
  let attributes: MatchAttributes
  let state: MatchAttributes.ContentState

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      if let venue = attributes.venue, !venue.isEmpty {
        W.eyebrow(venue.uppercased())
      }

      HStack(spacing: 12) {
        Side(
          fixtureId: attributes.fixtureId,
          slot: "home",
          abbr: attributes.homeAbbr,
          goals: state.homeGoals
        )
        Spacer(minLength: 8)
        Clock(state: state, size: 17)
        Spacer(minLength: 8)
        Side(
          fixtureId: attributes.fixtureId,
          slot: "away",
          abbr: attributes.awayAbbr,
          goals: state.awayGoals
        )
      }

      // ⚠⚠ **This replaces SPEC §196's `Checked 2h ago · no live feed yet`.**
      // That footer was the honest answer to a 4-hourly sweep; against a
      // 30-second feed it answers a question nobody is asking (ADR 0055).
      //
      // ⚠ And there is no stall line in its place: staleness is `aps.stale-date`
      // and iOS greys the card itself — see `MatchAttributes.ContentState`.
      if let moment = state.lastMoment {
        MomentLine(moment: moment)
      }
    }
    .padding(14)
  }
}

// MARK: - Pieces

/// One club: crest, three letters, and its goals.
///
/// ⚠ The losing digit is NOT dimmed here, unlike the app's `Score` atom
/// (ADR 0044). On a Lock Screen the card is glanced at from a metre away and the
/// dim tier does not survive that; both digits stay at full weight.
@available(iOS 18.0, *)
private struct Side: View {
  let fixtureId: String
  let slot: String
  let abbr: String
  let goals: Int?

  var body: some View {
    HStack(spacing: 6) {
      CrestView(fixtureId: fixtureId, slot: slot, abbr: abbr, size: 22)
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
