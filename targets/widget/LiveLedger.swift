import SwiftUI
import WidgetKit

/// The live ledger (ADR 0080) — the layout Ed picked ("Direction B") on the
/// design canvas: one row per side, crest · name · score, the followed side's
/// name in accent (the medium widget's ADR 0059 rule, brought to the small),
/// the leading side's score at full ink and the trailing side's dimmed.
///
/// Shared by the small and medium widgets; each wraps it in its own furniture.
enum Ledger {
  /// `1` / `–`. ⚠ A null score is "no score yet", NEVER `0` — the route is
  /// explicit that null does not mean nil–nil.
  static func score(_ goals: Int?) -> String {
    goals.map(String.init) ?? "–"
  }

  /// Ink for one side's score: the leader full, the trailer dimmed, level or
  /// unknown both full. `side` is that side's goals, `other` the opponent's.
  static func scoreInk(_ side: Int?, _ other: Int?) -> Color {
    guard let side, let other, side != other else { return Tok.ink }
    return side > other ? Tok.ink : Tok.ink55
  }

  /// What the minute slot prints, or nil (kicked off, minute not yet served —
  /// never `0′`). The colour dims when the data has stalled (ADR 0048/0049's
  /// rule: dim the minute, keep the score).
  static func minuteText(
    _ pair: FixtureEntry.LivePair,
    copy: WidgetSnapshot.Copy,
    at date: Date,
    stale: Bool
  ) -> (text: String, color: Color)? {
    guard let match = pair.match else { return nil }
    switch match.status {
    case "finished":
      return (copy.fullTimeLabel, Tok.ink55)
    case "halfTime":
      return (copy.halfTimeLabel, stale ? Tok.ink45 : Tok.live)
    default:
      guard let minute = match.displayMinute(at: date) else { return nil }
      return ("\(minute)′", stale ? Tok.ink45 : Tok.live)
    }
  }

  /// The line under the ledger: scorer first when the route has served events,
  /// the venue as the quieter fallback — both when they fit.
  static func footnote(_ pair: FixtureEntry.LivePair) -> String? {
    let parts = [pair.match?.lastEvent, pair.row.venue].compactMap { $0 }
    return parts.isEmpty ? nil : parts.joined(separator: " · ")
  }
}

/// The pulsing-dot eyebrow: `● LIVE`. The dot is drawn, not animated — a
/// widget renders instants.
struct LiveEyebrow: View {
  let text: String

  var body: some View {
    HStack(spacing: 5) {
      Circle()
        .fill(Tok.live)
        .frame(width: 6, height: 6)
        .background(Circle().fill(Tok.liveWash).frame(width: 12, height: 12))
      W.eyebrow(text, color: Tok.live)
    }
  }
}

/// The two team rows. `nameSize`/`scoreSize` differ between families; the
/// anatomy does not.
struct LedgerRows: View {
  let pair: FixtureEntry.LivePair
  let copy: WidgetSnapshot.Copy
  var crestSize: CGFloat = 26
  var nameSize: CGFloat = 14
  var scoreSize: CGFloat = 24

  var body: some View {
    let row = pair.row
    let home = pair.match?.homeGoals
    let away = pair.match?.awayGoals

    VStack(spacing: 6) {
      side(
        slot: "home", abbr: row.homeAbbr, name: row.homeName ?? row.homeAbbr,
        followed: row.isHome, goals: home, other: away
      )
      side(
        slot: "away", abbr: row.awayAbbr, name: row.awayName ?? row.awayAbbr,
        followed: !row.isHome, goals: away, other: home
      )
    }
  }

  private func side(
    slot: String, abbr: String, name: String,
    followed: Bool, goals: Int?, other: Int?
  ) -> some View {
    HStack(spacing: 8) {
      CrestView(fixtureId: pair.row.fixtureId, slot: slot, abbr: abbr, size: crestSize)

      // ⚠ The followed side lit, exactly the medium row's ADR 0059 rule — on
      // a two-row ledger the accent is what says which side is yours.
      Text(name)
        .font(.system(size: nameSize, weight: .semibold))
        .foregroundStyle(followed ? Tok.accent : Tok.ink78)
        .lineLimit(1)
        .minimumScaleFactor(0.7)

      Spacer(minLength: 4)

      Text(Ledger.score(goals))
        .font(Tok.numerals(scoreSize, .heavy))
        .foregroundStyle(Ledger.scoreInk(goals, other))
        .lineLimit(1)
    }
  }
}
