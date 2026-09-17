import SwiftUI
import WidgetKit

/// Home Screen standings widget for Alta Gama FC (systemLarge only).
/// Geometry and colour come from `Standings Widget.dc.html`; see
/// STANDINGS-WIDGET.md for the token table. Everything printed here arrives
/// pre-formatted from the feed.

enum Lime {
    static let accent   = Color(red: 200/255, green: 242/255, blue: 90/255)
    static let base     = Color(red: 11/255,  green: 13/255,  blue: 15/255)
    static let sky      = Color(red: 90/255,  green: 200/255, blue: 250/255)
    static let danger   = Color(red: 255/255, green: 92/255,  blue: 92/255).opacity(0.7)
    static let ink      = Color(red: 231/255, green: 235/255, blue: 236/255)
    static let posGrey  = Color(red: 124/255, green: 133/255, blue: 139/255)
    static let numGrey  = Color(red: 107/255, green: 116/255, blue: 123/255)
    static let metaGrey = Color(red: 89/255,  green: 98/255,  blue: 106/255)
}

enum Zone: String, Codable { case ucl, uel, none, relegation }

struct Row: Codable, Hashable, Identifiable {
    var id: Int { position }
    let position: Int
    let crest: URL?
    let abbr: String
    let name: String
    let played: Int
    let goalDiff: Int
    let points: Int
    let followed: Bool
    let zone: Zone
}

struct TableCopy: Codable, Hashable {
    let title: String   // "TABLE"
    let meta: String    // "LALIGA · AFTER MD 4"
    let pl: String, gd: String, pts: String
}

struct StandingsEntry: TimelineEntry {
    let date: Date
    let rows: [Row]     // exactly 20
    let copy: TableCopy
}

// MARK: - View

struct StandingsView: View {
    let entry: StandingsEntry
    @Environment(\.sizeCategory) private var sizeCategory

    private var compact: Bool { sizeCategory <= .large }

    var body: some View {
        VStack(spacing: 0) {
            header
                .frame(height: 13)
                .padding(.bottom, 3)
            if compact {
                VStack(spacing: 0) {
                    ForEach(entry.rows) { row in
                        StandingsRow(row: row, height: 15)
                    }
                }
                .frame(maxHeight: .infinity)
            } else {
                // Dynamic Type fallback: head of table + followed clubs under a seam.
                VStack(spacing: 0) {
                    ForEach(fallbackRows()) { row in
                        StandingsRow(row: row, height: 24)
                    }
                }
                .frame(maxHeight: .infinity)
            }
        }
        .padding(EdgeInsets(top: 10, leading: 14, bottom: 8, trailing: 14))
        .background(
            ZStack {
                Lime.base
                RadialGradient(colors: [Lime.accent.opacity(0.16), .clear],
                               center: UnitPoint(x: 1, y: -0.1), startRadius: 0, endRadius: 210)
            }
        )
        .widgetURL(URL(string: "altagama://table"))
    }

    private var header: some View {
        HStack(spacing: 5) {
            Image("mark-accent").resizable().scaledToFit().frame(width: 11)
            Text(entry.copy.title)
                .font(.system(size: 7.5, weight: .bold)).tracking(1.5)
                .foregroundStyle(Lime.accent)
                .frame(width: 41, alignment: .leading)
            Text(entry.copy.meta)
                .font(.system(size: 6.5, weight: .medium)).tracking(0.9)
                .foregroundStyle(Lime.metaGrey)
                .lineLimit(1)
            Spacer(minLength: 0)
            head(entry.copy.pl, 18); head(entry.copy.gd, 22); head(entry.copy.pts, 22)
        }
    }

    private func head(_ s: String, _ w: CGFloat) -> some View {
        Text(s).font(.system(size: 6, weight: .heavy)).tracking(0.85)
            .foregroundStyle(Lime.metaGrey)
            .frame(width: w, alignment: .trailing)
    }

    /// Ten rows: the head of the table, with followed clubs below the cut
    /// replacing the last head rows.
    private func fallbackRows() -> [Row] {
        let budget = 10
        let low = entry.rows.indices.filter { entry.rows[$0].followed }
        var head = budget
        while true {
            let next = budget - low.filter { $0 >= head }.count
            if next == head { break }
            head = next
        }
        return Array(entry.rows.prefix(head)) + low.filter { $0 >= head }.map { entry.rows[$0] }
    }
}

struct StandingsRow: View {
    let row: Row
    let height: CGFloat

    private var lit: Color { row.followed ? Lime.accent : Lime.ink }
    private var band: Color {
        switch row.zone {
        case .ucl: return Lime.accent
        case .uel: return Lime.sky
        case .relegation: return Lime.danger
        case .none: return .clear
        }
    }
    private var hairline: Bool { row.position == 7 || row.position == 18 }

    var body: some View {
        HStack(spacing: 5) {
            HStack(spacing: 3.5) {
                RoundedRectangle(cornerRadius: 1).fill(band).frame(width: 1.5, height: 8)
                Text("\(row.position)")
                    .font(.system(size: 7.5, weight: .bold).monospacedDigit())
                    .foregroundStyle(row.followed ? Lime.accent : Lime.posGrey)
            }
            .frame(width: 15, alignment: .leading)
            crest.frame(width: 11, height: 11)
            Text(row.name)
                .font(.system(size: 8, weight: .semibold)).tracking(-0.08)
                .foregroundStyle(lit).lineLimit(1).truncationMode(.tail)
            Spacer(minLength: 0)
            num("\(row.played)", 18, weight: .medium, color: Lime.numGrey, size: 7)
            num(row.goalDiff > 0 ? "+\(row.goalDiff)" : "\(row.goalDiff)", 22, weight: .medium, color: Lime.numGrey, size: 7)
            num("\(row.points)", 22, weight: .heavy, color: lit, size: 8)
        }
        .frame(height: height)
        .padding(.horizontal, 4)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(row.followed ? Lime.accent.opacity(0.12) : .clear)
        )
        .overlay(alignment: .top) {
            if hairline { Rectangle().fill(Color.white.opacity(0.10)).frame(height: 0.5) }
        }
        .padding(.horizontal, -4)
        .widgetURL(URL(string: "altagama://club/\(row.abbr.lowercased())"))
    }

    private func num(_ s: String, _ w: CGFloat, weight: Font.Weight, color: Color, size: CGFloat) -> some View {
        Text(s).font(.system(size: size, weight: weight).monospacedDigit())
            .foregroundStyle(color).frame(width: w, alignment: .trailing)
    }

    @ViewBuilder private var crest: some View {
        if let url = row.crest {
            AsyncImage(url: url) { $0.resizable().scaledToFit() } placeholder: { chip }
        } else { chip }
    }

    private var chip: some View {
        RoundedRectangle(cornerRadius: 3)
            .fill(Color(red: 30/255, green: 33/255, blue: 38/255))
            .overlay(RoundedRectangle(cornerRadius: 3).stroke(Color.white.opacity(0.14), lineWidth: 0.5))
            .overlay(Text(row.abbr).font(.system(size: 4.5, weight: .black)).foregroundStyle(Lime.posGrey))
    }
}

// MARK: - Widget

struct StandingsProvider: TimelineProvider {
    func placeholder(in: Context) -> StandingsEntry { .sample }
    func getSnapshot(in: Context, completion: @escaping (StandingsEntry) -> Void) { completion(.sample) }
    func getTimeline(in: Context, completion: @escaping (Timeline<StandingsEntry>) -> Void) {
        // Fetch the table snapshot from the app group container / feed here.
        completion(Timeline(entries: [.sample], policy: .after(Date().addingTimeInterval(15 * 60))))
    }
}

struct StandingsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "StandingsWidget", provider: StandingsProvider()) { entry in
            StandingsView(entry: entry).containerBackground(Lime.base, for: .widget)
        }
        .configurationDisplayName("Table")
        .description("The full LaLiga table with your clubs highlighted.")
        .supportedFamilies([.systemLarge])
        .contentMarginsDisabled()
    }
}

extension StandingsEntry {
    static let sample = StandingsEntry(
        date: .now,
        rows: [
            ("Barcelona","BAR",4,9,12,true,Zone.ucl),("R. Madrid","RMA",4,6,10,false,.ucl),("Villarreal","VIL",4,3,10,false,.ucl),
            ("Atlético","ATM",4,4,9,false,.ucl),("Valencia","VAL",4,4,9,false,.uel),("Athletic","ATH",4,2,8,true,.uel),
            ("Betis","BET",4,1,7,false,.none),("Celta","CEL",4,1,6,false,.none),("Sevilla","SEV",4,-1,6,false,.none),
            ("Rayo","RAY",4,0,5,false,.none),("Osasuna","OSA",4,-1,5,false,.none),("Getafe","GET",4,-1,4,false,.none),
            ("Espanyol","ESP",4,-2,4,false,.none),("R. Sociedad","RSO",4,-2,4,false,.none),("Elche","ELC",4,-2,3,false,.none),
            ("Alavés","ALA",4,-3,3,false,.none),("Deportivo","DEP",4,-3,3,false,.none),("Racing","RAC",4,-3,2,false,.relegation),
            ("Levante","LEV",4,-4,2,true,.relegation),("Málaga","MLG",4,-8,1,false,.relegation)
        ].enumerated().map { i, r in
            Row(position: i + 1, crest: nil, abbr: r.1, name: r.0, played: r.2, goalDiff: r.3, points: r.4, followed: r.5, zone: r.6)
        },
        copy: TableCopy(title: "TABLE", meta: "LALIGA · AFTER MD 4", pl: "PL", gd: "GD", pts: "PTS")
    )
}
