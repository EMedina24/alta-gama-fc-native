import SwiftUI
import WidgetKit

/// Your Week — systemMedium. Geometry and colour come from
/// `Your Week Widget.dc.html`; see YOUR-WEEK-WIDGET.md for the token table.
///
/// Everything printed here arrives pre-formatted in the snapshot: day and time
/// labels are localised server-side, club names arrive short. The widget never
/// formats a date or shortens a name itself.

enum Ink {
    static let lime  = Color(red: 200/255, green: 242/255, blue: 90/255)
    static let plate = Color(red: 11/255,  green: 13/255,  blue: 15/255)
    static let pool  = Color(red: 11/255,  green: 40/255,  blue: 32/255)
    static let club  = Color(red: 231/255, green: 235/255, blue: 236/255)
    static let railDay = Color(red: 107/255, green: 116/255, blue: 123/255)
    static let versus  = Color(red: 79/255,  green: 87/255,  blue: 93/255)
    static let count   = Color(red: 89/255,  green: 98/255,  blue: 106/255)
}

enum Side: String, Codable { case home, away }

struct WeekCopy: Codable {
    let yourWeek: String   // "YOUR WEEK"
    let clubCount: String  // "3 CLUBS"
    let home: String       // "HOME"
    let away: String       // "AWAY"
    let versus: String     // "v"
}

struct WeekFixture: Codable, Identifiable {
    var id: String { dayLabel + timeLabel + homeShort }
    let homeCrest: URL?
    let awayCrest: URL?
    let homeShort: String
    let awayShort: String
    let followed: Side
    let dayLabel: String
    let timeLabel: String

    func ink(for side: Side) -> Color { followed == side ? Ink.lime : Ink.club }
}

struct WeekSnapshot: Codable {
    let fixtures: [WeekFixture]   // hero is [0]; rail is the rest, max 2
    let copy: WeekCopy
}

// MARK: - Tile

struct YourWeekView: View {
    let snapshot: WeekSnapshot

    private var hero: WeekFixture? { snapshot.fixtures.first }
    private var rail: [WeekFixture] { Array(snapshot.fixtures.dropFirst().prefix(2)) }

    var body: some View {
        VStack(spacing: 0) {
            header
            HStack(spacing: 13) {
                if let hero { heroColumn(hero) }
                divider
                railColumn
            }
            .frame(maxHeight: .infinity)
        }
        .padding(EdgeInsets(top: 11, leading: 13, bottom: 11, trailing: 13))
        .background(plate)
        .clipShape(RoundedRectangle(cornerRadius: 21.5, style: .continuous))
        .overlay(alignment: .top) {
            Rectangle().fill(.white.opacity(0.10)).frame(height: 0.5)
        }
        .padding(2.5)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.white.opacity(0.045))
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(.white.opacity(0.09), lineWidth: 0.5)
                )
        )
    }

    /// Decoration only — never a data channel.
    private var plate: some View {
        Ink.plate.overlay {
            ZStack {
                RadialGradient(colors: [Ink.lime.opacity(0.20), .clear],
                               center: UnitPoint(x: 1, y: -0.08),
                               startRadius: 0, endRadius: 190)
                RadialGradient(colors: [Ink.pool.opacity(0.9), .clear],
                               center: UnitPoint(x: -0.06, y: 1.08),
                               startRadius: 0, endRadius: 170)
            }
        }
    }

    private var header: some View {
        HStack(spacing: 6) {
            Image("mark-accent").resizable().scaledToFit().frame(width: 12)
                .opacity(0.92)
            Text(snapshot.copy.yourWeek)
                .font(.system(size: 8.5, weight: .semibold)).kerning(1.7)
                .foregroundStyle(Ink.lime)
                .padding(.horizontal, 6.5).frame(height: 15)
                .background(Capsule().fill(Ink.lime.opacity(0.10)))
                .overlay(Capsule().strokeBorder(Ink.lime.opacity(0.30), lineWidth: 0.5))
            Spacer(minLength: 0)
            Text(snapshot.copy.clubCount)
                .font(.system(size: 8.5, weight: .medium)).kerning(1.2)
                .foregroundStyle(Ink.count)
        }
        .padding(.bottom, 9)
    }

    private var divider: some View {
        LinearGradient(colors: [.clear, .white.opacity(0.12), .white.opacity(0.12), .clear],
                       startPoint: .top, endPoint: .bottom)
            .frame(width: 0.5)
    }

    // MARK: Hero

    private func heroColumn(_ f: WeekFixture) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline, spacing: 7) {
                Text(f.timeLabel)
                    .font(.system(size: 27, weight: .ultraLight)).kerning(-0.95)
                    .monospacedDigit()
                Text(f.dayLabel)
                    .font(.system(size: 9.5, weight: .semibold)).kerning(1.5)
                    .foregroundStyle(Ink.lime)
            }
            HStack(spacing: 6) {
                crest(f.homeCrest, side: 20)
                Text(f.homeShort).modifier(HeroName(ink: f.ink(for: .home)))
                Text(snapshot.copy.versus)
                    .font(.system(size: 8.5)).foregroundStyle(Ink.versus)
                crest(f.awayCrest, side: 20)
                Text(f.awayShort).modifier(HeroName(ink: f.ink(for: .away)))
            }
            Text(f.followed == .home ? snapshot.copy.home : snapshot.copy.away)
                .font(.system(size: 8.5, weight: .semibold)).kerning(1.2)
                .foregroundStyle(.white.opacity(0.62))
                .padding(.horizontal, 5).frame(height: 13)
                .background(RoundedRectangle(cornerRadius: 4).fill(.white.opacity(0.06)))
                .overlay(RoundedRectangle(cornerRadius: 4)
                    .strokeBorder(.white.opacity(0.12), lineWidth: 0.5))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .layoutPriority(1.32)
    }

    // MARK: Rail

    private var railColumn: some View {
        VStack(spacing: 0) {
            ForEach(Array(rail.enumerated()), id: \.element.id) { i, f in
                if i > 0 {
                    Rectangle().fill(.white.opacity(0.07)).frame(height: 0.5)
                }
                railRow(f).padding(.vertical, 6.5)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func railRow(_ f: WeekFixture) -> some View {
        HStack(spacing: 6) {
            HStack(spacing: 1) {
                crest(f.homeCrest, side: 13)
                crest(f.awayCrest, side: 13)
            }
            VStack(alignment: .leading, spacing: 2.5) {
                Text(f.homeShort).modifier(RailName(ink: f.ink(for: .home), weight: .semibold))
                Text(f.awayShort).modifier(RailName(ink: f.ink(for: .away), weight: .medium))
            }
            Spacer(minLength: 2)
            VStack(alignment: .trailing, spacing: 2.5) {
                Text(f.dayLabel)
                    .font(.system(size: 8, weight: .semibold)).kerning(1.1)
                    .foregroundStyle(Ink.railDay)
                Text(f.timeLabel)
                    .font(.system(size: 10, weight: .medium)).kerning(-0.2)
                    .monospacedDigit().foregroundStyle(.white.opacity(0.88))
            }
        }
    }

    /// Crests are published for LaLiga only — anything else draws its
    /// abbreviation tile, never a generic placeholder crest.
    private func crest(_ url: URL?, side: CGFloat) -> some View {
        AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: {
            RoundedRectangle(cornerRadius: side * 0.3)
                .fill(Color.white.opacity(0.06))
        }
        .frame(width: side, height: side)
    }
}

private struct HeroName: ViewModifier {
    let ink: Color
    func body(content: Content) -> some View {
        content.font(.system(size: 11.5, weight: .semibold)).kerning(-0.23)
            .lineLimit(1).foregroundStyle(ink)
    }
}

private struct RailName: ViewModifier {
    let ink: Color
    let weight: Font.Weight
    func body(content: Content) -> some View {
        content.font(.system(size: 9, weight: weight)).kerning(-0.14)
            .lineLimit(1).foregroundStyle(ink)
    }
}

// MARK: - Widget

struct YourWeekWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "YourWeek", provider: WeekProvider()) { entry in
            YourWeekView(snapshot: entry.snapshot)
                .containerBackground(for: .widget) { Color.black }
        }
        .supportedFamilies([.systemMedium])
        .configurationDisplayName("Your Week")
        .description("The next kickoff for the clubs you follow.")
    }
}
