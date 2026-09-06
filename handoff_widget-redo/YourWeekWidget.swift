import SwiftUI
import WidgetKit

/// Your Week — systemMedium, day-spine layout. Geometry and colour come from
/// `Your Week Widget.dc.html`; see YOUR-WEEK-WIDGET.md for the token table.
///
/// Everything printed here arrives pre-formatted in the snapshot: day, date and
/// time labels are localised server-side, club names arrive short. The widget
/// never formats a date or shortens a name itself.

enum Ink {
    static let lime    = Color(red: 200/255, green: 242/255, blue: 90/255)
    static let plate   = Color(red: 11/255,  green: 13/255,  blue: 15/255)
    static let club    = Color(red: 231/255, green: 235/255, blue: 236/255)
    static let restName = Color(red: 223/255, green: 228/255, blue: 230/255)
    static let restTime = Color(red: 170/255, green: 179/255, blue: 184/255)
    static let restDay  = Color(red: 141/255, green: 151/255, blue: 157/255)
    static let date     = Color(red: 107/255, green: 116/255, blue: 123/255)
    static let dateDim  = Color(red: 89/255,  green: 98/255,  blue: 106/255)
    static let versus   = Color(red: 79/255,  green: 87/255,  blue: 93/255)
    static let count    = Color(red: 89/255,  green: 98/255,  blue: 106/255)
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
    var id: String { dayLabel + dateLabel + homeShort }
    let homeCrest: URL?
    let awayCrest: URL?
    let homeShort: String
    let awayShort: String
    let followed: Side
    let dayLabel: String    // "SAT" / "SÁB"
    let dateLabel: String   // "12 SEP"
    let timeLabel: String   // "21:00"

    func ink(for side: Side) -> Color { followed == side ? Ink.lime : Ink.club }
}

struct WeekSnapshot: Codable {
    let fixtures: [WeekFixture]   // next match is [0]; collapsed rows are the rest, max 2
    let copy: WeekCopy
}

// MARK: - Geometry

private enum G {
    static let gutter: CGFloat = 48    // date column — fixed so the spine stays plumb
    static let spine: CGFloat  = 7     // spine column
    static let inset: CGFloat  = 9     // content indent right of the spine
    static let node: CGFloat   = 7     // next-match node diameter
    static let dot: CGFloat    = 5     // collapsed-row ring diameter
}

// MARK: - Tile

struct YourWeekView: View {
    let snapshot: WeekSnapshot

    private var next: WeekFixture? { snapshot.fixtures.first }
    private var rest: [WeekFixture] { Array(snapshot.fixtures.dropFirst().prefix(2)) }

    var body: some View {
        VStack(spacing: 0) {
            header
            VStack(spacing: 0) {
                if let next { nextRow(next).layoutPriority(1.34) }
                ForEach(rest) { f in
                    Rectangle().fill(.white.opacity(0.07)).frame(height: 0.5)
                    restRow(f).layoutPriority(1)
                }
            }
            .padding(.top, 4)
            .frame(maxHeight: .infinity)
        }
        .padding(EdgeInsets(top: 10, leading: 13, bottom: 8, trailing: 13))
        .background(plate)
        .clipShape(RoundedRectangle(cornerRadius: 21, style: .continuous))
        .overlay(alignment: .top) {
            Rectangle().fill(.white.opacity(0.10)).frame(height: 0.5)
        }
        .padding(2)
        .background(
            RoundedRectangle(cornerRadius: 23, style: .continuous)
                .fill(.white.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 23, style: .continuous)
                        .strokeBorder(.white.opacity(0.09), lineWidth: 0.5)
                )
        )
    }

    /// Decoration only — never a data channel.
    private var plate: some View {
        Ink.plate.overlay {
            RadialGradient(colors: [Ink.lime.opacity(0.16), .clear],
                           center: UnitPoint(x: 1, y: -0.10),
                           startRadius: 0, endRadius: 185)
        }
    }

    private var header: some View {
        HStack(spacing: 6) {
            Image("mark-accent").resizable().scaledToFit().frame(width: 11)
                .opacity(0.92)
            Text(snapshot.copy.yourWeek)
                .font(.system(size: 8.5, weight: .bold)).kerning(1.7)
                .foregroundStyle(Ink.lime)
            Spacer(minLength: 0)
            Text(snapshot.copy.clubCount)
                .font(.system(size: 8.5, weight: .medium)).kerning(1.2)
                .foregroundStyle(Ink.count)
        }
        .frame(height: 15)
    }

    // MARK: Next match — the opened stop

    private func nextRow(_ f: WeekFixture) -> some View {
        HStack(alignment: .top, spacing: 0) {
            VStack(alignment: .trailing, spacing: 3) {
                Text(f.dayLabel)
                    .font(.system(size: 8.5, weight: .bold)).kerning(1.4)
                    .foregroundStyle(Ink.lime)
                Text(f.dateLabel)
                    .font(.system(size: 7.5, weight: .medium)).kerning(0.45)
                    .foregroundStyle(Ink.date)
            }
            .frame(width: G.gutter, alignment: .trailing)
            .padding(.top, 4)

            spine(next: true)

            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(f.timeLabel)
                        .font(.system(size: 23, weight: .ultraLight)).kerning(-0.8)
                        .monospacedDigit().foregroundStyle(Ink.club)
                    Text(f.followed == .home ? snapshot.copy.home : snapshot.copy.away)
                        .font(.system(size: 7.5, weight: .bold)).kerning(1.05)
                        .foregroundStyle(Ink.lime)
                        .padding(.horizontal, 5).frame(height: 13)
                        .background(RoundedRectangle(cornerRadius: 4).fill(Ink.lime.opacity(0.12)))
                        .overlay(RoundedRectangle(cornerRadius: 4)
                            .strokeBorder(Ink.lime.opacity(0.28), lineWidth: 0.5))
                }
                HStack(spacing: 5) {
                    crest(f.homeCrest, side: 15)
                    Text(f.homeShort).modifier(NextName(ink: f.ink(for: .home)))
                    Text(snapshot.copy.versus)
                        .font(.system(size: 8)).foregroundStyle(Ink.versus)
                    crest(f.awayCrest, side: 15)
                    Text(f.awayShort).modifier(NextName(ink: f.ink(for: .away)))
                }
            }
            .padding(.leading, G.inset)

            Spacer(minLength: 0)
        }
    }

    // MARK: Collapsed rows

    private func restRow(_ f: WeekFixture) -> some View {
        HStack(spacing: 0) {
            VStack(alignment: .trailing, spacing: 2.5) {
                Text(f.dayLabel)
                    .font(.system(size: 8, weight: .semibold)).kerning(1.3)
                    .foregroundStyle(Ink.restDay)
                Text(f.dateLabel)
                    .font(.system(size: 7, weight: .medium)).kerning(0.42)
                    .foregroundStyle(Ink.dateDim)
            }
            .frame(width: G.gutter, alignment: .trailing)

            spine(next: false)

            HStack(spacing: 6) {
                HStack(spacing: 1) {
                    crest(f.homeCrest, side: 12)
                    crest(f.awayCrest, side: 12)
                }
                Text("\(f.homeShort) \(snapshot.copy.versus) \(f.awayShort)")
                    .font(.system(size: 9, weight: .semibold)).kerning(-0.14)
                    .lineLimit(1).foregroundStyle(Ink.restName)
                Spacer(minLength: 2)
                Text(f.timeLabel)
                    .font(.system(size: 10, weight: .medium)).kerning(-0.2)
                    .monospacedDigit().foregroundStyle(Ink.restTime)
            }
            .padding(.leading, G.inset)
        }
    }

    /// Spine colour carries the state: solid lime node with a halo for the next
    /// match, hollow ring for the rest. The rail fades lime → white 10%.
    private func spine(next: Bool) -> some View {
        ZStack(alignment: .top) {
            if next {
                LinearGradient(colors: [Ink.lime.opacity(0.75), .white.opacity(0.10)],
                               startPoint: .top, endPoint: .bottom)
                    .frame(width: 1)
                    .padding(.top, 8)
                Circle().fill(Ink.lime).frame(width: G.node, height: G.node)
                    .overlay(Circle().strokeBorder(Ink.lime.opacity(0.16), lineWidth: 2)
                        .scaleEffect(1.6))
                    .padding(.top, 4)
            } else {
                Color.white.opacity(0.10).frame(width: 1)
                Circle().fill(Ink.plate)
                    .overlay(Circle().strokeBorder(.white.opacity(0.32), lineWidth: 1))
                    .frame(width: G.dot, height: G.dot)
                    .frame(maxHeight: .infinity, alignment: .center)
            }
        }
        .frame(width: G.spine)
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

private struct NextName: ViewModifier {
    let ink: Color
    func body(content: Content) -> some View {
        content.font(.system(size: 10.5, weight: .semibold)).kerning(-0.21)
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
