import ActivityKit
import SwiftUI
import WidgetKit

/// Lockscreen fixture card for Alta Gama FC. Geometry and colour come from
/// `Broadcast Widget.dc.html`; see BROADCAST-WIDGET.md for the token table.
///
/// Everything printed here arrives pre-formatted from the feed — kickoff time is
/// localised server-side, scorer names are already truncated. The widget never
/// abbreviates a surname or re-cases an abbreviation itself.

enum Lime {
    static let accent = Color(red: 200/255, green: 242/255, blue: 90/255)
    static let base   = Color(red: 7/255,   green: 8/255,   blue: 10/255)
    static let pool   = Color(red: 11/255,  green: 40/255,  blue: 32/255)
    static let yellow = Color(red: 242/255, green: 193/255, blue: 78/255)
    static let red    = Color(red: 255/255, green: 92/255,  blue: 71/255)
    static let redInk = Color(red: 255/255, green: 143/255, blue: 124/255)
}

struct Goal: Codable, Hashable {
    let name: String      // pre-truncated
    let minute: String    // "23'", "45+2'"
}

struct Discipline: Codable, Hashable {
    let yellow: Int
    let red: Int
}

struct Side: Codable, Hashable {
    let crest: URL?
    let abbr: String
    let record: String    // "2-1-0"
    let pts: Int
    let goals: [Goal]     // max 3; a fourth collapses to "+n"
    let cards: Discipline
}

struct MatchAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// `nil` before kickoff — the card switches state on this alone.
        let score: [Int]?
        let minute: String?
        let home: Side
        let away: Side
    }

    let venue: String       // "SAN MAMÉS · MD4"
    let competition: String // "2026-27 LALIGA"
    let matchday: String    // "MATCHDAY 4"
    let kickoff: String     // "15:30", localised upstream
}

// MARK: - Card

struct BroadcastCard: View {
    let attrs: MatchAttributes
    let state: MatchAttributes.ContentState

    private var isLive: Bool { state.score != nil }

    var body: some View {
        VStack(spacing: 12) {
            eyebrow
            fixture
            if isLive {
                Divider().overlay(Color.white.opacity(0.09))
                scorerColumns
                clockBar
            }
        }
        .padding(EdgeInsets(top: 13, leading: 16, bottom: 15, trailing: 16))
        .background(floodlights)
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .strokeBorder(Color.white.opacity(0.09), lineWidth: 0.5)
        )
    }

    /// Two unequal lime radials from the top corners — lit, not branded — over a
    /// deep green pool that keeps the lime off the crests.
    private var floodlights: some View {
        Lime.base.overlay {
            ZStack {
                RadialGradient(colors: [Lime.accent.opacity(0.34), .clear],
                               center: .topLeading, startRadius: 0, endRadius: 300)
                RadialGradient(colors: [Lime.accent.opacity(0.30), .clear],
                               center: .topTrailing, startRadius: 0, endRadius: 300)
                RadialGradient(colors: [Lime.pool.opacity(0.85), .clear],
                               center: UnitPoint(x: 0.5, y: 1.18), startRadius: 0, endRadius: 260)
            }
        }
    }

    private var eyebrow: some View {
        HStack(spacing: 8) {
            if isLive, let minute = state.minute {
                Circle().fill(Lime.accent).frame(width: 5, height: 5)
                    .modifier(Pulse())
                Text(minute)
                    .font(.system(size: 11, weight: .bold)).kerning(1.3)
                    .foregroundStyle(Lime.accent).monospacedDigit()
                dot
                Text(attrs.venue).modifier(EyebrowInk())
            } else {
                Text(attrs.competition).modifier(EyebrowInk())
                dot
                Text(attrs.matchday).modifier(EyebrowInk())
            }
        }
    }

    private var dot: some View {
        Circle().fill(Color.white.opacity(0.34)).frame(width: 3, height: 3)
    }

    private var fixture: some View {
        HStack(spacing: 10) {
            crest(state.home.crest)
            column(state.home, dimmed: false)
            centre
            column(state.away, dimmed: isLive)
            crest(state.away.crest)
        }
    }

    private func crest(_ url: URL?) -> some View {
        AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: { Color.clear }
            .frame(width: 46, height: 46)
    }

    private func column(_ side: Side, dimmed: Bool) -> some View {
        VStack(spacing: 4) {
            Text(side.abbr)
                .font(.system(size: 30, weight: .heavy)).kerning(-0.6)
                .foregroundStyle(dimmed ? Color.white.opacity(0.78) : .white)
            if isLive {
                Text(side.abbr == state.home.abbr ? "HOME" : "AWAY")
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundStyle(Color.white.opacity(0.6))
            } else {
                Text("\(side.record)\n\(side.pts) PTS")
                    .font(.system(size: 11.5, weight: .medium))
                    .multilineTextAlignment(.center).monospacedDigit()
                    .foregroundStyle(Color.white.opacity(0.6))
            }
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder private var centre: some View {
        if let score = state.score {
            HStack(spacing: 11) {
                Text("\(score[0])").modifier(ScoreInk(dim: false))
                Rectangle().fill(Color.white.opacity(0.32)).frame(width: 9, height: 1.5)
                Text("\(score[1])").modifier(ScoreInk(dim: true))
            }
        } else {
            VStack(spacing: 7) {
                Image("mark-accent").resizable().scaledToFit().frame(width: 19)
                Text(attrs.kickoff)
                    .font(.system(size: 21, weight: .semibold)).kerning(-0.4)
                    .monospacedDigit()
            }
        }
    }

    /// Mirrored inward: home is glyph-first, away is name-first, so the side of
    /// each goal reads without a label. The away glyph sits at 50% lime.
    private var scorerColumns: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 7) {
                ForEach(state.home.goals, id: \.self) { g in
                    HStack(spacing: 7) { GoalGlyph(alpha: 1); GoalLabel(goal: g) }
                }
                CardCounts(cards: state.home.cards, alignment: .leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Rectangle().fill(Color.white.opacity(0.09)).frame(width: 0.5)

            VStack(alignment: .trailing, spacing: 7) {
                ForEach(state.away.goals, id: \.self) { g in
                    HStack(spacing: 7) { GoalLabel(goal: g); GoalGlyph(alpha: 0.5, flipped: true) }
                }
                CardCounts(cards: state.away.cards, alignment: .trailing)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }

    private var clockBar: some View {
        GeometryReader { geo in
            let pct = min(1, max(0, Double(state.minute?.prefix(2) ?? "0") ?? 0 / 90)
                            / 90 * 90 / 90)
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.12))
                Capsule().fill(Lime.accent).frame(width: geo.size.width * pct)
            }
        }
        .frame(height: 3)
    }
}

// MARK: - Pieces

private struct GoalGlyph: View {
    let alpha: Double
    var flipped: Bool = false
    var body: some View {
        Image("goal-glyph")
            .resizable().scaledToFit().frame(width: 14, height: 12)
            .opacity(alpha)
            .scaleEffect(x: flipped ? -1 : 1)
    }
}

private struct GoalLabel: View {
    let goal: Goal
    var body: some View {
        (Text(goal.name).font(.system(size: 12, weight: .semibold))
            .foregroundColor(.white.opacity(0.9))
         + Text(" \(goal.minute)").font(.system(size: 12, weight: .regular))
            .foregroundColor(.white.opacity(0.6)))
            .lineLimit(1).monospacedDigit()
    }
}

private struct CardCounts: View {
    let cards: Discipline
    let alignment: HorizontalAlignment
    var body: some View {
        HStack(spacing: 9) {
            if cards.yellow > 0 { pill(count: cards.yellow, chip: Lime.yellow, ink: .white.opacity(0.55)) }
            if cards.red > 0 { pill(count: cards.red, chip: Lime.red, ink: Lime.redInk) }
        }
    }
    private func pill(count: Int, chip: Color, ink: Color) -> some View {
        HStack(spacing: 6) {
            if alignment == .leading {
                chipShape(chip); countText(count, ink)
            } else {
                countText(count, ink); chipShape(chip)
            }
        }
    }
    private func chipShape(_ c: Color) -> some View {
        RoundedRectangle(cornerRadius: 2).fill(c).frame(width: 8, height: 11.4)
    }
    private func countText(_ n: Int, _ ink: Color) -> some View {
        Text("\(n)").font(.system(size: 11, weight: .semibold)).monospacedDigit().foregroundStyle(ink)
    }
}

private struct EyebrowInk: ViewModifier {
    func body(content: Content) -> some View {
        content.font(.system(size: 11.5, weight: .medium))
            .foregroundStyle(Color.white.opacity(0.62))
    }
}

private struct ScoreInk: ViewModifier {
    let dim: Bool
    func body(content: Content) -> some View {
        content.font(.system(size: 34, weight: .bold)).kerning(-1)
            .monospacedDigit()
            .foregroundStyle(dim ? Color.white.opacity(0.58) : .white)
    }
}

private struct Pulse: ViewModifier {
    @State private var on = true
    func body(content: Content) -> some View {
        content.opacity(on ? 1 : 0.35)
            .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: on)
            .onAppear { on.toggle() }
    }
}

// MARK: - Activity

struct BroadcastActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MatchAttributes.self) { context in
            BroadcastCard(attrs: context.attributes, state: context.state)
                .activityBackgroundTint(Lime.base)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    BroadcastCard(attrs: context.attributes, state: context.state)
                }
            } compactLeading: {
                Circle().fill(Lime.accent).frame(width: 6, height: 6)
            } compactTrailing: {
                Text(context.state.score.map { "\($0[0])-\($0[1])" } ?? context.attributes.kickoff)
                    .font(.system(size: 13, weight: .semibold)).monospacedDigit()
            } minimal: {
                Circle().fill(Lime.accent).frame(width: 6, height: 6)
            }
        }
    }
}
