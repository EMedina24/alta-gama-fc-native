import SwiftUI
import UIKit

/// The broadcast card's layout gate (ADR 0135).
///
/// ⚠⚠ **This compiles the REAL `MatchActivity.swift` — it is not a copy.** ADR
/// 0085's measurement was scratch work at one width (369pt) and was thrown away;
/// a Display-Zoomed phone narrows the card to widths nobody ever rendered, and
/// the "R…" / clipped-digit report is what that cost. This jig renders the exact
/// production views at every card width a supported device can produce and fails
/// loudly when the layout stops fitting. Run it before shipping ANY change to
/// `MatchActivity.swift` — the file's header says the same.
///
/// Build & run (simulator must be booted):
/// ```
/// xcrun swiftc -parse-as-library \
///   -target arm64-apple-ios18.0-simulator \
///   -sdk "$(xcrun --show-sdk-path --sdk iphonesimulator)" \
///   targets/widget/MatchActivity.swift targets/widget/Mark.swift \
///   targets/_shared/MatchAttributes.swift targets/_shared/Tokens.swift \
///   targets/_shared/CrestView.swift targets/_shared/Glyphs.swift \
///   scripts/activity-harness.swift -o /tmp/activity-harness
/// xcrun simctl spawn booted /tmp/activity-harness --out /tmp/renders
/// ```
///
/// What it checks:
///  - **Height** ≤ `lockScreenCap` for both card states at every width in the
///    1pt sweep — the real composed card, so a wrap anywhere shows up here.
///  - **The never-truncate valve**: at every sweep width, with the WORST
///    realistic content, fixed chrome + the score cluster's ideal + two floored
///    abbreviations (and their meta lines) must fit. The floors come from
///    `Geometry`, so the gate and the card cannot drift apart.
///  - **Readability**: at the nine real device widths, TYPICAL content (a
///    one-digit score) must hold ≥ `readableScale` effective abbreviation scale
///    on standard-and-mainstream cards (`readableFrom` up), and ≥
///    `cornerScale` on the zoomed-mini class below it.
///  - PNGs at the nine real device widths, for the eyeball pass.
///  - ⚠ The Dynamic Island pieces are rendered for eyeballing only — their
///    regions' widths are Apple's and undocumented, so there is nothing honest
///    to assert against.
///
/// ⚠ Layout literals MIRRORED from `LockScreenCard`, because they are inline in
/// view code the jig cannot reach into: the card's 16pt horizontal padding, the
/// side column's `maxWidth: .infinity` split, the abbreviation/meta fonts, and
/// the pre-match centre (Mark 19 over the 21pt kickoff time). Everything else —
/// crest, gaps, score sizes, kern, bleed, floors, tier threshold — is read from
/// `Geometry` or rendered through the real structs. Move a mirrored literal
/// there, move it here.
@available(iOS 18.0, *)
@MainActor
enum Harness {
  // ------------------------------------------------------------- the matrix --

  /// Apple caps the Lock Screen presentation at ~160pt (ADR 0085).
  static let lockScreenCap: CGFloat = 160

  /// Card width = device logical width − 24pt of system inset — anchored on ADR
  /// 0085's one measured point (369pt card on a 393pt device) and extrapolated.
  /// Standard AND Display Zoom widths for every iOS 18-capable iPhone:
  ///   296 → zoomed mini/SE/XS · 351 → zoomed mainstream (the bug report's
  ///   class) · 366/369/378/390 → standard mid-size · 404/406/416 → Max/Plus.
  static let deviceWidths: [CGFloat] = [296, 351, 366, 369, 378, 390, 404, 406, 416]

  /// The assertion sweep: every 1pt from below the smallest to above the
  /// largest, so the extrapolated inset being off by a few points cannot slip a
  /// failing width between two sampled ones.
  static let sweep = stride(from: CGFloat(290), through: 420, by: 1)

  /// Readability line: typical content must hold this effective abbreviation
  /// scale on every card from `readableFrom` up (standard devices and zoomed
  /// mainstream ones), and `cornerScale` below it (the zoomed-mini class,
  /// where everything on the screen is small).
  static let readableScale: CGFloat = 0.75
  static let cornerScale: CGFloat = 0.55
  static let readableFrom: CGFloat = 330

  // ----------------------------------------------------------- the fixtures --

  /// Worst realistic content: two wide M-initial abbreviations, a two-digit
  /// score, the longest plausible scorer + `45+2'` + overflow + both pills on
  /// both sides, ES furniture throughout (`VISITA` is wider than `AWAY`).
  static let attributes = MatchAttributes(
    fixtureId: "harness",
    homeSlug: "man-united", awaySlug: "man-city",
    homeAbbr: "MUN", awayAbbr: "MCI",
    homeName: "Manchester United", awayName: "Manchester City",
    venue: "SAN MAMÉS",
    kickoffEpoch: Date().addingTimeInterval(45 * 60).timeIntervalSince1970,
    competition: "2026-27 CHAMPIONS LEAGUE",
    matchday: "JORNADA 38", matchdayShort: "J38",
    homeRecord: "10-10-10", awayRecord: "10-10-10",
    homePts: 38, awayPts: 38,
    homeTag: "LOCAL", awayTag: "VISITA",
    ptsLabel: "PTS"
  )

  static let liveWorst = MatchAttributes.ContentState(
    homeGoals: 10, awayGoals: 8,
    phase: "second_half",
    minuteLabel: nil,
    clockFromEpoch: Date().addingTimeInterval(-83 * 60).timeIntervalSince1970,
    lastMoment: MatchAttributes.Moment(
      kind: "red-card", minuteLabel: "90+12'", player: "Lewandowski",
      teamSlug: "man-city", consequenceLabel: "Man City 10 men"
    ),
    homeScorers: [.init(name: "Lewandowski", minuteLabel: "45+2'")],
    awayScorers: [.init(name: "Wirtz", minuteLabel: "90+12'")],
    homeMoreGoals: 9, awayMoreGoals: 7,
    homeCards: .init(yellow: 3, red: 1),
    awayCards: .init(yellow: 2, red: 2)
  )

  /// The typical live shape the readability line is held against.
  static let liveTypical = MatchAttributes.ContentState(
    homeGoals: 2, awayGoals: 0,
    phase: "first_half",
    minuteLabel: nil,
    clockFromEpoch: Date().addingTimeInterval(-26 * 60).timeIntervalSince1970,
    lastMoment: nil,
    homeScorers: [.init(name: "Mbappé", minuteLabel: "14'")],
    awayScorers: nil,
    homeMoreGoals: 1, awayMoreGoals: nil,
    homeCards: nil, awayCards: nil
  )

  /// The other live shape: nothing reported yet — `–` digits, empty band.
  static let liveSparse = MatchAttributes.ContentState(
    homeGoals: nil, awayGoals: nil,
    phase: "first_half",
    minuteLabel: nil,
    clockFromEpoch: Date().addingTimeInterval(-14 * 60).timeIntervalSince1970,
    lastMoment: nil,
    homeScorers: nil, awayScorers: nil,
    homeMoreGoals: nil, awayMoreGoals: nil,
    homeCards: nil, awayCards: nil
  )

  static let preMatch = MatchAttributes.ContentState(
    homeGoals: nil, awayGoals: nil,
    phase: "scheduled",
    minuteLabel: nil,
    clockFromEpoch: nil,
    lastMoment: nil,
    homeScorers: nil, awayScorers: nil,
    homeMoreGoals: nil, awayMoreGoals: nil,
    homeCards: nil, awayCards: nil
  )

  // -------------------------------------------------------------- rendering --

  static func size<V: View>(of view: V, width: CGFloat? = nil) -> CGSize {
    let renderer = ImageRenderer(content: view)
    renderer.scale = 2
    renderer.proposedSize = ProposedViewSize(width: width, height: nil)
    return renderer.uiImage?.size ?? .zero
  }

  static func png<V: View>(_ view: V, width: CGFloat?, to url: URL) {
    let renderer = ImageRenderer(content: view)
    renderer.scale = 3
    renderer.proposedSize = ProposedViewSize(width: width, height: nil)
    guard let data = renderer.uiImage?.pngData() else {
      failures.append("render: no image for \(url.lastPathComponent)")
      return
    }
    do { try data.write(to: url) } catch {
      failures.append("render: cannot write \(url.lastPathComponent): \(error)")
    }
  }

  static func card(_ state: MatchAttributes.ContentState) -> some View {
    LockScreenCard(attributes: attributes, state: state)
      .background(Tok.activityGround)
  }

  // ------------------------------------------------------------ the numbers --

  /// The score cluster's ideal width in a tier, from the REAL `ScoreDigit`.
  static func clusterIdeal(_ m: Geometry.Metrics, home: Int?, away: Int?) -> CGFloat {
    size(of: ScoreDigit(goals: home, dim: false, size: m.score)).width
      + size(of: ScoreDigit(goals: away, dim: true, size: m.score)).width
      + m.divider + 2 * m.clusterGap
  }

  /// The pre-match centre's ideal width: the Mark over the kickoff time, in the
  /// SIMULATOR's locale — a 12-hour host measures the wide `3:31 PM` shape,
  /// which is the worst one. ⚠ MIRROR: `centre(_:)`'s pre-match branch.
  static var preCentreIdeal: CGFloat {
    max(19, size(of: Text(attributes.kickoffUtc, style: .time)
      .font(.system(size: 21, weight: .semibold)).monospacedDigit()).width)
  }

  /// A single-line text's ideal width. ⚠ MIRROR: the fonts in `side(...)`.
  static func abbrIdeal(_ m: Geometry.Metrics, _ text: String) -> CGFloat {
    size(of: Text(text).font(.system(size: m.abbr, weight: .heavy))
      .kerning(Geometry.abbrKern)).width
  }

  static func metaIdeal(_ text: String) -> CGFloat {
    size(of: Text(text).font(.system(size: 11.5, weight: .medium)).monospacedDigit()).width
  }

  /// What each flexible side column is granted once the fixed pieces took
  /// theirs. ⚠ MIRROR: the card's 32pt of horizontal padding and the even
  /// `maxWidth: .infinity` split.
  static func granted(cardWidth: CGFloat, m: Geometry.Metrics, centre: CGFloat) -> CGFloat {
    let content = cardWidth - 32
    let chrome = 2 * m.crest + 4 * m.gap
    return (content - chrome - centre) / 2 - 2 * Geometry.kernBleed
  }

  // ------------------------------------------------------------------- main --

  static var failures: [String] = []

  static func check(
    _ label: String, at width: CGFloat, granted: CGFloat, ideal: CGFloat,
    floor: CGFloat, into firsts: inout [String: String]
  ) {
    if granted < ideal * floor, firsts[label] == nil {
      firsts[label] = String(format:
        "%@: at width %.0f the column grants %.1fpt against %.1fpt ideal — "
          + "below the %.2f floor (%.1fpt), it truncates",
        label, width, granted, ideal, floor, ideal * floor)
    }
  }

  static func run(outDir: String) {
    let out = URL(fileURLWithPath: outDir, isDirectory: true)
    try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

    // 1 · Height, at every width in the sweep, all states.
    var heightFirsts: [String: String] = [:]
    for width in sweep {
      for (name, state) in [("live", liveWorst), ("sparse", liveSparse), ("pre", preMatch)] {
        let height = size(of: card(state), width: width).height
        if height > lockScreenCap, heightFirsts[name] == nil {
          heightFirsts[name] = String(format:
            "height: %@ card is %.1fpt at width %.0f (cap %.0f)",
            name, height, width, lockScreenCap)
        }
      }
    }
    failures.append(contentsOf: heightFirsts.values.sorted())

    // 2 · The never-truncate valve, worst content, every sweep width.
    var valveFirsts: [String: String] = [:]
    for width in sweep {
      let m = Geometry.metrics(for: width - 32)
      let liveGrant = granted(
        cardWidth: width, m: m,
        centre: clusterIdeal(m, home: liveWorst.homeGoals, away: liveWorst.awayGoals))
      check("abbr", at: width, granted: liveGrant, ideal: abbrIdeal(m, "MUN"),
        floor: Geometry.abbrFloor, into: &valveFirsts)
      check("tag", at: width, granted: liveGrant, ideal: metaIdeal("VISITA"),
        floor: Geometry.metaFloor, into: &valveFirsts)

      let preGrant = granted(cardWidth: width, m: m, centre: preCentreIdeal)
      check("record", at: width, granted: preGrant, ideal: metaIdeal("10-10-10"),
        floor: Geometry.metaFloor, into: &valveFirsts)
      check("pts", at: width, granted: preGrant, ideal: metaIdeal("38 PTS"),
        floor: Geometry.metaFloor, into: &valveFirsts)
    }
    failures.append(contentsOf: valveFirsts.values.sorted())

    // 3 · Readability at the nine real widths, typical content.
    print("width · tier · typical abbr scale · worst abbr scale")
    for width in deviceWidths {
      let m = Geometry.metrics(for: width - 32)
      let ideal = abbrIdeal(m, "MUN")
      let typical = min(1, granted(
        cardWidth: width, m: m,
        centre: clusterIdeal(m, home: liveTypical.homeGoals, away: liveTypical.awayGoals)) / ideal)
      let worst = min(1, granted(
        cardWidth: width, m: m,
        centre: clusterIdeal(m, home: liveWorst.homeGoals, away: liveWorst.awayGoals)) / ideal)
      let tier = m.crest == Geometry.regular.crest ? "regular" : "compact"
      print(String(format: "  %.0f · %@ · %.2f · %.2f", width, tier, typical, worst))
      let line = width >= readableFrom ? readableScale : cornerScale
      if typical < line {
        failures.append(String(format:
          "readability: typical content at width %.0f draws the abbreviation at "
            + "%.2f scale (line %.2f)", width, typical, line))
      }
    }

    // 4 · Reference heights — ADR 0085 measured 152.5 live / 121 pre at 369.
    let live369 = size(of: card(liveWorst), width: 369).height
    let pre369 = size(of: card(preMatch), width: 369).height
    print(String(format: "at 369pt: live %.1fpt · pre %.1fpt (0085: 152.5 / 121)",
      live369, pre369))

    // 5 · PNGs at the nine real device widths, for the eyeball pass.
    for width in deviceWidths {
      png(card(liveWorst), width: width, to: out.appendingPathComponent("card-live-w\(Int(width)).png"))
      png(card(liveTypical), width: width, to: out.appendingPathComponent("card-typical-w\(Int(width)).png"))
      png(card(liveSparse), width: width, to: out.appendingPathComponent("card-sparse-w\(Int(width)).png"))
      png(card(preMatch), width: width, to: out.appendingPathComponent("card-pre-w\(Int(width)).png"))
    }

    // 6 · The island pieces, intrinsic — eyeball only (see the header).
    let islandGround = Color.black
    png(HStack(spacing: 0) {
      IslandSide(fixtureId: "harness", slot: "home", abbr: "MUN", goals: 10)
      Spacer(minLength: 12)
      IslandSide(fixtureId: "harness", slot: "away", abbr: "MCI", goals: 8)
    }.padding(8).background(islandGround), width: nil,
      to: out.appendingPathComponent("island-sides.png"))
    png(ScoreLine(state: liveWorst, size: 15).padding(8).background(islandGround),
      width: nil, to: out.appendingPathComponent("island-scoreline.png"))
    if let moment = liveWorst.lastMoment {
      png(MomentLine(moment: moment).padding(8).background(islandGround),
        width: nil, to: out.appendingPathComponent("island-moment.png"))
    }

    // ------------------------------------------------------------- verdict --
    if failures.isEmpty {
      print("OK — every width \(Int(sweep.min() ?? 0))–\(Int(sweep.max() ?? 0)) fits, renders in \(outDir)")
    } else {
      print("FAIL —")
      for failure in failures { print("  · \(failure)") }
      exit(1)
    }
  }
}

@main
struct HarnessMain {
  static func main() {
    var outDir = FileManager.default.temporaryDirectory
      .appendingPathComponent("activity-harness").path
    var args = CommandLine.arguments.dropFirst().makeIterator()
    while let arg = args.next() {
      if arg == "--out", let value = args.next() { outDir = value }
    }
    if #available(iOS 18.0, *) {
      MainActor.assumeIsolated { Harness.run(outDir: outDir) }
    } else {
      print("activity-harness needs the iOS 18 simulator runtime")
      exit(1)
    }
  }
}
