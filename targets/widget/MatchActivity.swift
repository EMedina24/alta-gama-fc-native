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
///
/// ⚠ **The card's pieces are `internal`, not `private`, and that is load-bearing
/// for the layout gate.** `scripts/activity-harness.swift` compiles this exact
/// file into a measurement jig and renders the card across every real device
/// width (ADR 0135) — a `private` here is a piece the gate cannot see. Inside
/// the extension binary the two spellings are identical.
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
struct LockScreenCard: View {
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
    // ⚠ Every font on this card is a fixed `.system(size:)`, which Dynamic Type
    // does not scale — today this cap costs nothing. It is here so that any
    // future system-styled text (or an OS that starts scaling activity text)
    // cannot grow a card measured to 7pt of spare (ADR 0135).
    .dynamicTypeSize(...DynamicTypeSize.large)
  }

  /// Two unequal lime radials from the top corners over a deep green pool, with
  /// the mesh's cool third light in the bottom-right corner.
  ///
  /// ⚠ **34% and 30%, and the asymmetry is the point** — the card reads as *lit*
  /// rather than branded, and neither club owns the warm side.
  ///
  /// ⚠⚠ **`EllipticalGradient`, not `RadialGradient`.** The design's
  /// `radial-gradient(78% 120% at 0% 0%, …)` is an ellipse taller than it is
  /// wide; SwiftUI's `RadialGradient` is strictly circular and cannot express it.
  /// The handoff's Swift uses the circular one with a hard-coded `endRadius`,
  /// which lands nowhere near the mock at any card width.
  ///
  /// ⚠⚠ **ADR 0104 changed this by ADDITION only, and deliberately so.** The two
  /// lime radials and the green pool are ADR 0085 measured values on a card that
  /// is drawn over the reader's own wallpaper; this is also the one surface in
  /// the target that cannot be verified from a simulator, because nothing in
  /// this repo starts an activity — the server push-to-starts it. So the aurora
  /// arrives as the mesh's third, coolest pool in the corner the app's own mesh
  /// puts it, and as the lit top edge every glass card in the app carries.
  /// Nothing recorded was moved or re-valued. If the palette still reads warm
  /// against the app once a real push has been seen, the next step is the GREEN
  /// pool's colour, not the lime.
  ///
  /// ⚠ **No `glassEffect` on this card, at any iOS version.** The system already
  /// composites a Live Activity onto its own material and gives it glass chrome
  /// of its own on iOS 26; a second material inside that reads muddy rather than
  /// deeper. (The widgets draw no real glass either — theirs erases its own
  /// subtree, HANDOFF trap 52 / ADR 0104 — but the reason differs: they paint
  /// their glass because they OWN their whole rectangle; this card does not.)
  ///
  /// ⚠ Costs zero height, which is the binding constraint here: this is a
  /// `.background(…)` and an `.overlay(…)`, neither of which is a layout child.
  /// The live card measures 152.5pt against Apple's ~160pt cap (ADR 0085).
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
      // ⚠ The mesh's blue-teal pool (`#1c546c`), in the corner theme.ts's `Mesh`
      // puts it — `cx 1.08, cy 0.86`, off the bottom-right edge. Alpha 0.28
      // rather than the mesh's 0.50: it is landing on a 152pt card over a
      // photograph, not on a 930pt screen over a known ground.
      EllipticalGradient(
        colors: [Tok.mesh[2].color.opacity(0.28), Tok.activityGround.opacity(0)],
        center: UnitPoint(x: 1.08, y: 0.86),
        startRadiusFraction: 0,
        endRadiusFraction: 0.62
      )
    }
    .overlay(alignment: .top) {
      Rectangle().fill(Tok.plateTop).frame(height: 1)
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

  /// ⚠⚠ **A `GeometryReader`, because the row must know how wide the card
  /// actually is (ADR 0135).** The fixed cost of crests, gaps and padding does
  /// not shrink with a Display-Zoomed screen; below `Geometry.compactBelow` the
  /// row switches to the compact tier rather than handing the loss to the two
  /// flexible abbreviation columns. A reader is the one width probe an ARCHIVED
  /// activity render honours — `@State` written from a measurement never
  /// re-renders there. It is greedy, so the height is pinned from the same font
  /// metrics the row draws with (`Geometry.fixtureHeight`); the compact tier is
  /// shorter and centres inside the regular pin, keeping the card's height
  /// identical across tiers.
  private var fixture: some View {
    GeometryReader { geo in
      let m = Geometry.metrics(for: geo.size.width)
      HStack(spacing: m.gap) {
        crest("home", attributes.homeAbbr, m)
        side(
          abbr: attributes.homeAbbr,
          tag: attributes.homeTag,
          record: attributes.homeRecord,
          pts: attributes.homePts,
          dimmed: false,
          metrics: m
        )
        centre(m)
        side(
          abbr: attributes.awayAbbr,
          tag: attributes.awayTag,
          record: attributes.awayRecord,
          pts: attributes.awayPts,
          // ⚠ The away ABBREVIATION dims only while live, matching the away score
          // beside it. Before kick-off neither side is behind.
          dimmed: isLive,
          metrics: m
        )
        crest("away", attributes.awayAbbr, m)
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .frame(height: Geometry.fixtureHeight(metaLines: metaLines))
  }

  /// What is actually drawn under the abbreviations, for the row's height pin.
  /// The taller side wins — the server can null one club's record and not the
  /// other's.
  private var metaLines: Int {
    if isLive {
      return (attributes.homeTag != nil || attributes.awayTag != nil) ? 1 : 0
    }
    let record = attributes.homeRecord != nil || attributes.awayRecord != nil
    let pts = attributes.ptsLabel != nil
      && (attributes.homePts != nil || attributes.awayPts != nil)
    return (record ? 1 : 0) + (record && pts ? 1 : 0)
  }

  /// ⚠ `showsAbbr: false` — this row already prints the abbreviation at 30pt,
  /// and the fallback tile printing it too is the `ATH ATH` doubling logged in
  /// HANDOFF item 5.
  private func crest(_ slot: String, _ abbr: String, _ m: Geometry.Metrics) -> some View {
    CrestView(
      fixtureId: attributes.fixtureId,
      slot: slot,
      abbr: abbr,
      size: m.crest,
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
    dimmed: Bool,
    metrics m: Geometry.Metrics
  ) -> some View {
    VStack(spacing: 4) {
      Text(abbr)
        .font(.system(size: m.abbr, weight: .heavy))
        .kerning(Geometry.abbrKern)
        .foregroundStyle(dimmed ? Tok.ink78 : Tok.ink)
        .lineLimit(1)
        // ⚠ 0.5, from 0085's 0.8 — measured, not chosen (ADR 0135). At 351pt of
        // Display-Zoomed card a two-digit score leaves each column 35pt against
        // a 69pt ideal; 0.8 rescued nothing and the code truncated to `R…`. A
        // small club code is merely small — a truncated one is wrong.
        .minimumScaleFactor(Geometry.abbrFloor)
        .allowsTightening(true)
        // ⚠ The bleed for the kern's painted overdraw — see `Geometry.abbrKern`.
        .padding(.horizontal, Geometry.kernBleed)

      if isLive {
        if let tag {
          Text(tag)
            .font(.system(size: 11.5, weight: .medium))
            .foregroundStyle(Tok.ink60)
            // ⚠ Without the line limit, `VISITA` WRAPS in a compressed column —
            // measured at 180.5pt of card against the 160 cap (ADR 0135), and
            // what falls off the bottom is the clock bar.
            .lineLimit(1)
            .minimumScaleFactor(Geometry.metaFloor)
        }
      } else if let record {
        // ⚠ Absent rather than `0-0-0` when the standings view cannot answer —
        // the server nulls it, and the line simply does not draw.
        Text(record)
          .font(.system(size: 11.5, weight: .medium))
          .monospacedDigit()
          .foregroundStyle(Tok.ink60)
          .lineLimit(1)
          .minimumScaleFactor(Geometry.metaFloor)
        if let pts, let label = attributes.ptsLabel {
          Text("\(pts) \(label)")
            .font(.system(size: 11.5, weight: .medium))
            .monospacedDigit()
            .foregroundStyle(Tok.ink60)
            .lineLimit(1)
            .minimumScaleFactor(Geometry.metaFloor)
        }
      }
    }
    .frame(maxWidth: .infinity)
  }

  /// The score, or the mark over the kickoff time.
  ///
  /// ⚠⚠ **`fixedSize` + `layoutPriority(1)`, and both are load-bearing (ADR
  /// 0135).** The centre is all counts and clocks, and a compressed count clips
  /// mid-glyph — the shipped "digits cut in half" bug was exactly this cluster
  /// giving way first because it was the one primary text with no guard. Now it
  /// never gives; the floored abbreviation columns absorb the loss, which is
  /// what they are for.
  @ViewBuilder private func centre(_ m: Geometry.Metrics) -> some View {
    if isLive {
      HStack(spacing: m.clusterGap) {
        ScoreDigit(goals: state.homeGoals, dim: false, size: m.score)
        Rectangle().fill(Tok.ink32).frame(width: m.divider, height: 1.5)
        // ⚠ The away digit at 58%. Unlike ADR 0044's `Score` atom this is NOT
        // "dim the loser" — it is a fixed side treatment, so the card reads the
        // same whoever is ahead.
        ScoreDigit(goals: state.awayGoals, dim: true, size: m.score)
      }
      .fixedSize()
      .layoutPriority(1)
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
        //
        // ⚠ No kern. It carried -0.4 until ADR 0135: negative kerning
        // under-reports layout width against painted advance, and on a clock
        // the clipped trailing digit is a wrong time.
        Text(attributes.kickoffUtc, style: .time)
          .font(.system(size: 21, weight: .semibold))
          .monospacedDigit()
          .foregroundStyle(Tok.ink)
          .lineLimit(1)
      }
      .fixedSize()
      .layoutPriority(1)
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
/// ⚠ **`crest` is NOT what gives** — *for height*. The obvious trim — 46 → 40 —
/// saves exactly nothing there: the crest never binds the fixture row's height,
/// because the abbreviation-and-tag column beside it is 53.5pt. Width is a
/// different story, which is what the compact tier below is for.
///
/// ⚠⚠ **The card has a WIDTH story too, and it is measured, not guessed (ADR
/// 0135).** ADR 0085's harness rendered one width — 369pt, a standard mid-size
/// phone. A Display-Zoomed phone narrows the card to 351pt (mainstream) or
/// 296pt (mini/SE class), and the fixture row's fixed cost does not narrow with
/// it — the loss lands entirely on the two flexible abbreviation columns, which
/// is the shipped `R…` / clipped-digit bug. `scripts/activity-harness.swift`
/// renders every one of those widths and is the gate for any change here.
@available(iOS 18.0, *)
enum Geometry {
  static let crest: CGFloat = 46
  /// ⚠ 10, not the design's 12 — see above.
  static let stack: CGFloat = 10
  /// ⚠ 9, not the design's 11 — see above.
  static let bandTop: CGFloat = 9

  // ---------------------------------------- width resilience (ADR 0135) --

  /// One tier of the fixture row's sizes. Two exist; `metrics(for:)` picks.
  struct Metrics {
    let crest: CGFloat
    /// The fixture row's gap — four of them across the row.
    let gap: CGFloat
    let abbr: CGFloat
    let score: CGFloat
    /// The score cluster's inner gap — two of them around the divider.
    let clusterGap: CGFloat
    let divider: CGFloat
  }

  /// The ADR 0085 sizes, untouched.
  static let regular = Metrics(
    crest: 46, gap: 10, abbr: 30, score: 34, clusterGap: 11, divider: 9)

  /// The narrow-card tier: everything fixed gives a step so the abbreviations
  /// keep readable scale. Chosen by measurement — at 296pt of card the regular
  /// tier leaves each abbreviation column 4.5pt (ADR 0135's table).
  static let compact = Metrics(
    crest: 36, gap: 8, abbr: 26, score: 30, clusterGap: 8, divider: 7)

  /// The tier threshold, in CONTENT width — the fixture row measures itself
  /// inside the card's 32pt of horizontal padding. 320 content-pt ≈ a 352pt
  /// card: every Display-Zoomed phone drops below it, every standard one stays
  /// above. At the boundary the two tiers render the TYPICAL card (one-digit
  /// score) at near-identical effective sizes, so there is no visible cliff.
  static let compactBelow: CGFloat = 320

  static func metrics(for contentWidth: CGFloat) -> Metrics {
    contentWidth < compactBelow ? compact : regular
  }

  /// The abbreviation's kern, and the 1pt of bleed that pays for it. ⚠ Negative
  /// kerning under-reports a `Text`'s layout width against its painted advance
  /// — the trailing glyph draws past the frame and is clipped. The bleed padding
  /// absorbs exactly that overdraw. Counts and clocks carry NO kern at all (ADR
  /// 0135's rule: negative kerning never rides on a count or a clock).
  static let abbrKern: CGFloat = -0.6
  static let kernBleed: CGFloat = 1

  /// How far `minimumScaleFactor` may take each text.
  ///
  /// ⚠⚠ **These are never-truncate VALVES, not targets.** SwiftUI scales only as
  /// far as the width shortage demands, so on every real card the text draws far
  /// above its floor — the harness asserts ≥0.75 effective scale on typical
  /// content at every real device width. The floor only opens fully in the
  /// measured corner (a 296pt zoomed-mini card carrying a two-digit score), and
  /// there a small club code is merely small where a truncated one (`R…`) is
  /// wrong. The harness reads these, so the gate and the card cannot drift.
  static let abbrFloor: CGFloat = 0.4
  static let metaFloor: CGFloat = 0.6
  static let islandFloor: CGFloat = 0.7

  // ⚠⚠ The fixture row sits in a `GeometryReader` (the only way an archived
  // Live Activity can read its own width — `@State`-driven measurement never
  // re-renders in that context), and a `GeometryReader` is greedy: without a
  // pinned height it swallows the card. The pin is DERIVED, not hand-measured:
  // the same UIFont metrics the row's own type resolves to, so a font-size
  // change here moves the pin with it. Always the REGULAR tier's type — the
  // compact row is shorter and simply centres, which keeps the card's height
  // identical across tiers.

  static func lineHeight(_ size: CGFloat, _ weight: UIFont.Weight) -> CGFloat {
    UIFont.systemFont(ofSize: size, weight: weight).lineHeight.rounded(.up)
  }

  /// The abbreviation-and-meta column's height, from real font metrics.
  /// `metaLines` is what the card is actually drawing under the abbreviation:
  /// 1 for the live tag, up to 2 pre-match (record + points), 0 when the server
  /// nulled them.
  static func fixtureHeight(metaLines: Int) -> CGFloat {
    let column = lineHeight(regular.abbr, .heavy)
      + CGFloat(metaLines) * (4 + lineHeight(11.5, .medium))
    return max(regular.crest, column)
  }
}

// MARK: - Pieces

/// The live marker: a 5pt lime dot that breathes.
///
/// ⚠ **One of only two things that move between pushes**, the clock bar being
/// the other. Everything else on this card changes when a push arrives and not
/// otherwise, which is the entire budget rule.
@available(iOS 18.0, *)
struct LiveDot: View {
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
struct Separated: View {
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
///
/// ⚠ No kern. It carried -1 until ADR 0135: negative kerning under-reports a
/// `Text`'s layout width against its painted advance, and this was the view
/// whose trailing glyph shipped clipped in half. Between two digits of a score
/// the tightening was invisible anyway.
@available(iOS 18.0, *)
struct ScoreDigit: View {
  let goals: Int?
  let dim: Bool
  /// From the fixture row's tier — `Geometry.regular.score` or the compact step.
  let size: CGFloat

  var body: some View {
    Text(goals.map(String.init) ?? "–")
      .font(.system(size: size, weight: .bold))
      .monospacedDigit()
      .foregroundStyle(dim ? Tok.ink58 : Tok.ink)
      .lineLimit(1)
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
struct ScorerColumn: View {
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
struct ScorerLabel: View {
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
struct DisciplinePills: View {
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
/// ⚠ At half time, during penalties and at full time `clockFrom` is nil, because
/// a running clock is a claim that play is happening. The bar then holds a
/// STATIC fraction rather than disappearing — a card whose foot vanishes at the
/// break looks broken.
///
/// ⚠⚠ **The break holds at the half, not at full.** Full is right for the
/// whistle and was the only stopped case that could occur before backend
/// decision 0057: `phaseOf` could never return `half_time`, so the clock ran
/// straight through the interval and this branch never saw it. Once the break
/// publishes, a full bar would jump the foot from ~50% to 100% and back down at
/// the restart — the bar reading further through the match than the match is.
@available(iOS 18.0, *)
struct ClockBar: View {
  let state: MatchAttributes.ContentState

  /// Where a stopped bar sits. ⚠ Only the break is mid-match; every other
  /// stopped state is at or past the end.
  private var stoppedFraction: CGFloat {
    state.phase == "half_time" ? 0.5 : 1
  }

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
        // ⚠ A fraction, never empty. An emptied bar at full time would read as
        // "not started" — the failure the full bar was chosen to avoid, and
        // the reason the default here stays 1.
        //
        // ⚠ `GeometryReader` rather than `ProgressView(value:)`: the bar is
        // 3pt tall inside a `Capsule` mask, and the system style adds its own
        // track and insets that fight the mask at that height.
        GeometryReader { geo in
          Capsule()
            .fill(Tok.accent)
            .frame(width: geo.size.width * stoppedFraction)
        }
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
struct IslandSide: View {
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
        .lineLimit(1)
        .minimumScaleFactor(Geometry.metaFloor)
      // ⚠ The count wins over the abbreviation — the same rule the scorer band
      // records: a scaled club code is merely smaller, a clipped count is wrong.
      Text(goals.map(String.init) ?? "–")
        .font(Tok.numerals(20, .bold))
        .foregroundStyle(Tok.ink)
        .lineLimit(1)
        .layoutPriority(1)
    }
    .dynamicTypeSize(...DynamicTypeSize.large)
  }
}

/// `1–0`, for the two Dynamic Island slots that have room for nothing else.
@available(iOS 18.0, *)
struct ScoreLine: View {
  let state: MatchAttributes.ContentState
  let size: CGFloat

  var body: some View {
    Text("\(state.homeGoals.map(String.init) ?? "–")–\(state.awayGoals.map(String.init) ?? "–")")
      .font(Tok.numerals(size, .bold))
      .foregroundStyle(Tok.ink)
      // ⚠ Scaled, deliberately NOT `fixedSize` (ADR 0135): in compactTrailing
      // and minimal an overflowing score clips at the sensor housing — hardware,
      // which no layout priority argues with. A whole smaller score stays right.
      .lineLimit(1)
      .minimumScaleFactor(Geometry.islandFloor)
      .dynamicTypeSize(...DynamicTypeSize.large)
  }
}

/// The minute — counted on device while play is running, printed otherwise.
///
/// ⚠⚠ **`clockFrom` is not kickoff.** It is a synthetic instant the server
/// re-anchors on every push so that elapsed-since equals the reported minute; a
/// timer anchored to actual kickoff counts the half-time break and is wrong for
/// the whole second half. See `MatchAttributes.ContentState.clockFrom`.
@available(iOS 18.0, *)
struct Clock: View {
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
    .lineLimit(1)
    .dynamicTypeSize(...DynamicTypeSize.large)
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
struct MomentLine: View {
  let moment: MatchAttributes.Moment

  var body: some View {
    HStack(spacing: 6) {
      // ⚠ A count — it never gives (ADR 0135, the scorer band's rule).
      Text(moment.minuteLabel)
        .font(Tok.numerals(11, .bold))
        .foregroundStyle(tint)
        .fixedSize()
      if let player = moment.player, !player.isEmpty {
        // ⚠ The name is the first thing to give — a truncated name is merely
        // shorter where a truncated minute or consequence is wrong.
        Text(player)
          .font(Tok.micro(11))
          .foregroundStyle(Tok.ink78)
          .lineLimit(1)
          .layoutPriority(-1)
      }
      if let consequence = moment.consequenceLabel {
        Text(consequence)
          .font(Tok.micro(10))
          .foregroundStyle(Tok.redInk)
          .lineLimit(1)
      }
    }
    .dynamicTypeSize(...DynamicTypeSize.large)
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
