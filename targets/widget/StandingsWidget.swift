import SwiftUI
import WidgetKit

/// **STANDINGS** — a league table in the large tile (ADR 0185,
/// `handoff_standings_widget/`).
///
/// ⚠ **Geometry and type come from the mock CSS ÷2** (`Standings Widget.dc.html`,
/// drawn at 2× a 338×354 tile). The handoff's reference Swift is NOT this file's
/// ancestor: it invents a URL scheme (`altagama://`), draws the mark from an
/// image asset the target does not ship, loads crests with `AsyncImage` (dead in
/// a widget), hardcodes the zone hairlines to rows 7 and 18, assumes twenty
/// LaLiga rows, and bands every table whether or not it may be banded.
///
/// ⚠⚠ **The tile decides nothing.** Which rows, which bands, where the rules and
/// the seam go — all of it arrives in `StandingsSnapshot`, decided by the same
/// JS functions the Table tab runs. This file only lays it out.
///
/// ⚠ **One tap target: the whole tile opens the Table tab on this league** (Ed,
/// 2026-09-17). The handoff's per-row club links are dropped — a 15pt row is
/// not a tap target, and `.widgetURL` on a row does not work anyway (only the
/// last one in the tree wins).
///
/// ⚠ **No Dynamic Type fallback**, unlike the handoff's `sizeCategory` branch:
/// every font here is `.system(size:)`, which a widget does not scale, so the
/// 20-row layout cannot overflow at a larger text size. The branch would be
/// dead code that nobody could reach to test.
struct StandingsWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(
      kind: "Standings",
      intent: SelectLeagueIntent.self,
      provider: StandingsProvider()
    ) { entry in
      StandingsView(entry: entry)
        .containerBackground(for: .widget) { MeshPlate() }
    }
    .configurationDisplayName("Table")
    .description("The table for a league you pick, with your clubs highlighted.")
    .supportedFamilies([.systemLarge])
    // ⚠ Safe configuration-wide: large only, no accessory family (the NEWS
    // widget's argument). Content supplies its own padding.
    .contentMarginsDisabled()
  }
}

// MARK: - Timeline

struct StandingsEntry: TimelineEntry {
  let date: Date
  let copy: StandingsSnapshot.Copy
  let table: StandingsSnapshot.Table?
}

/// ⚠⚠ **No network, and a `.never` reload policy.** A table only moves when a
/// match is played, and the app rewrites `standings.json` and reloads every
/// widget when it does (`src/features/standings/sync.ts`, change-guarded).
/// A timer here would spend WidgetKit's rationed reloads re-reading a file that
/// has not changed (trap 34).
///
/// ⚠ The consequence, accepted in ADR 0185: a reader who never opens the app
/// sees the table as of their last visit. The meta line's `AFTER MD 4` says
/// exactly which round that is, so the tile is stale but never wrong about it.
struct StandingsProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> StandingsEntry {
    entry(StandingsSnapshot.placeholder, league: nil)
  }

  /// ⚠ The gallery sample ONLY while `context.isPreview` — see
  /// `StandingsSnapshot.placeholder`.
  func snapshot(for configuration: SelectLeagueIntent, in context: Context) async -> StandingsEntry {
    let source = context.isPreview
      ? (StandingsSnapshot.load() ?? .placeholder)
      : (StandingsSnapshot.load() ?? .unavailable)
    return entry(source, league: configuration.league?.id)
  }

  func timeline(for configuration: SelectLeagueIntent, in context: Context) async -> Timeline<StandingsEntry> {
    let source = StandingsSnapshot.load() ?? .unavailable
    return Timeline(entries: [entry(source, league: configuration.league?.id)], policy: .never)
  }

  private func entry(_ snapshot: StandingsSnapshot, league: String?) -> StandingsEntry {
    StandingsEntry(date: Date(), copy: snapshot.copy, table: snapshot.table(for: league))
  }
}

// MARK: - Ink

/// The mock's opaque greys as WHITE-ALPHA over `Tok.plate` (`#0b0d0f`), so the
/// hierarchy survives the system's tinted/clear rendering (ADR 0114): an opaque
/// grey flattens to full white there, and every column with it.
private enum Ink {
  /// Club name — mock `#e7ebec`.
  static let name = Color.white.opacity(0.92)
  /// Position — mock `#7c858b`.
  static let position = Color.white.opacity(0.46)
  /// PL and GD — mock `#6b747b`.
  static let number = Color.white.opacity(0.39)
  /// Meta line and column heads — mock `#59626a`.
  static let meta = Color.white.opacity(0.32)
  /// The zone hairlines — mock `rgba(255,255,255,.10)`.
  static let rule = Color.white.opacity(0.10)
  /// A followed row's wash — mock `rgba(200,242,90,.12)`.
  static let followedWash = Tok.accent.opacity(0.12)
}

/// The band rails — theme.ts `bandUcl` … `bandOut`, the app's `BAND_COLOR`.
///
/// ⚠ **The APP's colours, not the handoff's.** The mock carried a sky blue and a
/// 70% red of its own, and had no Conference, play-off or eliminated band at
/// all. A rail on the tile and the rail on the Table tab it opens must be the
/// same colour, or the reader has two keys for one table.
///
/// ⚠ `r16` is the same hex as `ucl` and a DIFFERENT statement — the theme.ts
/// warning, carried here as two names on purpose.
private enum BandInk {
  static func color(_ band: StandingsSnapshot.Band) -> Color {
    switch band {
    case .ucl: return Tok.accent // #c8f25a
    case .uel: return Color(red: 111 / 255, green: 201 / 255, blue: 255 / 255) // #6fc9ff
    case .conf: return Color(red: 183 / 255, green: 155 / 255, blue: 255 / 255) // #b79bff
    case .rel: return Color(red: 255 / 255, green: 107 / 255, blue: 94 / 255) // #ff6b5e
    case .r16: return Tok.accent // #c8f25a
    case .playoff: return Color(red: 211 / 255, green: 194 / 255, blue: 255 / 255) // #d3c2ff
    case .out: return Color(red: 255 / 255, green: 122 / 255, blue: 107 / 255) // #ff7a6b
    }
  }
}

// MARK: - Geometry

/// The mock ÷2. Column widths are FIXED so the numbers stay plumb down the
/// table; only the name column flexes.
enum StandingsGeometry {
  /// The mock's `10 / 14 / 8` plus the tray's 2pt inset (ADR 0128), which
  /// content pays in its padding.
  static let padding = EdgeInsets(top: 12, leading: 16, bottom: 10, trailing: 16)
  static let headerHeight: CGFloat = 13
  static let headerGap: CGFloat = 3
  static let gutter: CGFloat = 5
  static let position: CGFloat = 15
  static let crest: CGFloat = 11
  static let played: CGFloat = 18
  static let goalDiff: CGFloat = 22
  static let points: CGFloat = 22
  static let titleWidth: CGFloat = 41
  /// The design row. Rows stretch toward `maxRow` when a league has fewer
  /// clubs (Puerto Rico's 11), and compress on the smallest large tile.
  static let designRow: CGFloat = 15
  static let maxRow: CGFloat = 22
  /// The highlight's bleed past the content edge — mock `margin: 0 -4`.
  static let bleed: CGFloat = 4
}

private typealias G = StandingsGeometry

// MARK: - Tile

struct StandingsView: View {
  let entry: StandingsEntry

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      header
        .frame(height: G.headerHeight)
        .padding(.bottom, G.headerGap)

      if let table = entry.table, !table.rows.isEmpty {
        StandingsRows(rows: table.rows)
      } else {
        emptyState
      }
    }
    .padding(G.padding)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    // ⚠ The ONLY tap target (see the type header). Nil while there is no
    // table, so the tap falls through to opening the app.
    .widgetURL(entry.table?.url)
  }

  private var header: some View {
    HStack(spacing: G.gutter) {
      // ⚠ `.widgetAccentable()` on the lime voice only (ADR 0114).
      Mark(size: 11)
        .widgetAccentable()
      Text(entry.copy.title)
        .font(.system(size: 7.5, weight: .bold))
        .tracking(1.5)
        .foregroundStyle(Tok.accent)
        .lineLimit(1)
        .frame(width: G.titleWidth, alignment: .leading)
        .widgetAccentable()
      Text(entry.table?.meta ?? "")
        .font(.system(size: 6.5, weight: .medium))
        .tracking(0.9)
        .foregroundStyle(Ink.meta)
        .lineLimit(1)
        .truncationMode(.tail)
      Spacer(minLength: 0)
      if entry.table != nil {
        head(entry.copy.pl, G.played)
        head(entry.copy.gd, G.goalDiff)
        head(entry.copy.pts, G.points)
      }
    }
  }

  private func head(_ text: String, _ width: CGFloat) -> some View {
    Text(text)
      .font(.system(size: 6, weight: .heavy))
      .tracking(0.85)
      .foregroundStyle(Ink.meta)
      .lineLimit(1)
      .frame(width: width, alignment: .trailing)
  }

  private var emptyState: some View {
    // ⚠ No second mark: the header already carries one, and the first render
    // drew the pitch twice, one above the other.
    VStack(alignment: .leading, spacing: 6) {
      Spacer(minLength: 0)
      Text(entry.copy.empty)
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(Tok.ink62)
        .lineLimit(3)
        .minimumScaleFactor(0.85)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// The rows, spread to fill the tile — the mock's `space-between`.
///
/// ⚠ Measured, not fixed at 15pt: a large tile is 311pt tall on the smallest
/// phone and 379pt on the largest, and a league can have 11 rows or 20. Each
/// SLOT (a row, or a seam) gets an equal height, clamped between a compressed
/// design row and `maxRow`; whatever is left is spread between slots. Type
/// scales with the row, so an 11-row table reads larger rather than sparser.
struct StandingsRows: View {
  let rows: [StandingsSnapshot.Row]

  private var slots: Int { rows.count + rows.filter(\.seamAbove).count }

  var body: some View {
    GeometryReader { geo in
      let count = CGFloat(max(slots, 1))
      let rowHeight = min(geo.size.height / count, G.maxRow)
      let gap = count > 1 ? max(0, (geo.size.height - rowHeight * count) / (count - 1)) : 0
      let scale = min(max(rowHeight / G.designRow, 0.85), 1.3)

      VStack(spacing: gap) {
        ForEach(rows) { row in
          if row.seamAbove {
            Seam(scale: scale)
              .frame(height: rowHeight)
          }
          StandingsRow(row: row, scale: scale)
            .frame(height: rowHeight)
        }
      }
      .frame(width: geo.size.width, height: geo.size.height, alignment: .top)
    }
  }
}

/// `···` in the position column — rows were skipped to reach the next one.
private struct Seam: View {
  let scale: CGFloat

  var body: some View {
    HStack(spacing: 0) {
      Text("···")
        .font(.system(size: 8 * scale, weight: .heavy))
        .foregroundStyle(Ink.meta)
        .lineLimit(1)
      Spacer(minLength: 0)
    }
    // Under the position digits: past the rail (1.5) and its gap (3.5).
    .padding(.leading, 5 * scale)
  }
}

struct StandingsRow: View {
  let row: StandingsSnapshot.Row
  let scale: CGFloat

  private var lit: Color { row.followed ? Tok.accent : Ink.name }

  var body: some View {
    HStack(spacing: G.gutter) {
      HStack(spacing: 3.5 * scale) {
        RoundedRectangle(cornerRadius: 1)
          .fill(row.band.map(BandInk.color) ?? .clear)
          .frame(width: 1.5, height: 8 * scale)
        Text("\(row.rank)")
          .font(Tok.numerals(7.5 * scale, .bold))
          .foregroundStyle(row.followed ? Tok.accent : Ink.position)
          .lineLimit(1)
          .fixedSize(horizontal: true, vertical: false)
          .accentIf(row.followed)
      }
      .frame(width: G.position * scale, alignment: .leading)

      CrestView(
        fixtureId: nil,
        slot: "",
        abbr: row.abbr,
        size: G.crest * scale,
        tone: .open,
        groupPath: row.crestFile.map { "standings-crests/\($0)" }
      )

      Text(row.name)
        .font(.system(size: 8 * scale, weight: .semibold))
        .tracking(-0.08)
        .foregroundStyle(lit)
        .lineLimit(1)
        .truncationMode(.tail)
        .accentIf(row.followed)

      Spacer(minLength: 0)

      number("\(row.played)", G.played, size: 7, weight: .medium, color: Ink.number)
      number(row.goalDiff, G.goalDiff, size: 7, weight: .medium, color: Ink.number)
      number("\(row.points)", G.points, size: 8, weight: .heavy, color: lit)
        .accentIf(row.followed)
    }
    .padding(.horizontal, G.bleed)
    .frame(maxHeight: .infinity)
    .background(
      RoundedRectangle(cornerRadius: 4, style: .continuous)
        .fill(row.followed ? Ink.followedWash : .clear)
    )
    .overlay(alignment: .top) {
      if row.ruleAbove {
        // ⚠ Offset UP into the gap above the row, so the hairline sits between
        // rows rather than across the top of a followed row's wash.
        Rectangle()
          .fill(Ink.rule)
          .frame(height: 0.5)
          .offset(y: -0.5)
      }
    }
    .padding(.horizontal, -G.bleed)
  }

  private func number(
    _ text: String, _ width: CGFloat, size: CGFloat, weight: Font.Weight, color: Color
  ) -> some View {
    Text(text)
      // ⚠ Capped lower than the name's scale, and allowed to shrink: Puerto
      // Rico's table runs to a THREE-digit goal difference (`-205`), which at
      // the 11-row scale overran its 22pt column and truncated to `-2…` on the
      // first render. A number must never truncate.
      .font(Tok.numerals(size * min(scale, 1.1), weight))
      .foregroundStyle(color)
      .lineLimit(1)
      .minimumScaleFactor(0.6)
      // ⚠ The WIDTH does not scale: these columns sit under the header's
      // `PL GD PTS`, which is fixed, and must stay plumb with it.
      .frame(width: width, alignment: .trailing)
  }
}

private extension View {
  /// The followed club's lime joins the accent group under tinted rendering,
  /// so "your club" still reads when every other colour flattens (ADR 0114).
  @ViewBuilder
  func accentIf(_ on: Bool) -> some View {
    if on { widgetAccentable() } else { self }
  }
}
