import SwiftUI

/// The goal ball and the discipline chip, as SwiftUI.
///
/// ⚠⚠ **Drawn, not imported — and there is no asset catalog to import from.**
/// `targets/widget/expo-target.config.js` declines `@bacons/apple-targets`'
/// `images:` key on purpose: a PNG renders fine on a home screen but is
/// flattened to a mask on the Lock Screen and under iOS 18's tinted rendering,
/// where a filled path keeps its geometry. `Mark.swift` is the same call for the
/// club mark, and `handoff_alerts-redo/BroadcastActivity.swift` asking for
/// `Image("goal-glyph")` is the one part of that file that could not be ported.
///
/// ⚠ **The coordinates come from `EventPlate.swift`, not from re-measuring the
/// SVG.** That file already transcribed the identical viewBoxes — `24×20` for
/// the ball, `11×15` for the card at `1.5,1.6,8,11.4 rx 2` — for the notification
/// attachment, which has to be UIKit because an attachment is a PNG on disk.
/// Re-measuring is how one drawing drifts from the other; this is the third
/// surface and it must be the same mark.
///
/// ⚠ **Shared across targets** — `targets/_shared/` compiles into every one.

/// The goal ball: a lime disc with a dark pentagon.
///
/// ⚠⚠ **The ball sits OFF-CENTRE in its box, and that is the design, not a
/// cropping error.** `cx` is 15.2 in a 24-wide viewBox, so roughly the left
/// third is empty — and `flipped` mirrors the whole box, which puts that empty
/// third on the other side. The card draws the home glyph unflipped and the away
/// glyph flipped, so in both columns the ball hugs the scorer's name and the
/// space falls on the outside. Centring the ball would close that gap and cost
/// the mirroring its point (ADR 0085).
struct GoalGlyph: View {
  /// The rendered width. Height follows the viewBox, as the SVG's default
  /// `xMidYMid meet` does.
  var width: CGFloat = 14

  /// ⚠ The AWAY glyph draws at 50% lime. That single step is how "who is
  /// winning" reads before a name does — see `BROADCAST-WIDGET.md`.
  var opacity: Double = 1

  /// Mirrors the box. See the off-centre note above.
  var flipped: Bool = false

  private static let designWidth: CGFloat = 24
  private static let designHeight: CGFloat = 20

  var body: some View {
    let scale = width / Self.designWidth
    let height = Self.designHeight * scale

    Canvas { context, _ in
      let s = { (x: CGFloat, y: CGFloat) in CGPoint(x: x * scale, y: y * scale) }

      // Circle(cx: 15.2, cy: 10, r: 8)
      let r = 8 * scale
      let centre = s(15.2, 10)
      context.fill(
        Path(ellipseIn: CGRect(
          x: centre.x - r, y: centre.y - r, width: r * 2, height: r * 2
        )),
        with: .color(Tok.accent)
      )

      // PENTAGON: M15.2 6.1 l3.71 2.7 -1.42 4.36 h-4.58 L11.49 8.8 z
      var pentagon = Path()
      pentagon.move(to: s(15.2, 6.1))
      pentagon.addLine(to: s(18.91, 8.8))
      pentagon.addLine(to: s(17.49, 13.16))
      pentagon.addLine(to: s(12.91, 13.16))
      pentagon.addLine(to: s(11.49, 8.8))
      pentagon.closeSubpath()
      // ⚠ `onAccent`, not black. The pentagon is a hole in the lime disc and it
      // has to read as one against the card's own ground.
      context.fill(pentagon, with: .color(Tok.onAccent))
    }
    .frame(width: width, height: height)
    .opacity(opacity)
    .scaleEffect(x: flipped ? -1 : 1)
  }
}

/// One booking chip — the rounded rectangle beside a discipline count.
///
/// ⚠ The rect is inset inside its own viewBox (`1.5,1.6` in an `11×15` box), so
/// the drawn chip is smaller than the frame it occupies. That inset is the gap
/// the design leaves between a chip and the numeral beside it; hard-coding the
/// rect at its raw size instead — which the handoff's Swift does — makes every
/// pill sit tighter than the mock.
struct CardChip: View {
  var color: Color
  var width: CGFloat = 9

  private static let designWidth: CGFloat = 11
  private static let designHeight: CGFloat = 15

  var body: some View {
    // ⚠ `min`, matching the SVG's default `xMidYMid meet`: the design asks for
    // a 9×12 box around an 11×15 viewBox, and height is the binding constraint.
    let scale = min(width / Self.designWidth, (width * 12 / 9) / Self.designHeight)

    Canvas { context, _ in
      let rect = CGRect(
        x: 1.5 * scale,
        y: 1.6 * scale,
        width: 8 * scale,
        height: 11.4 * scale
      )
      context.fill(
        Path(roundedRect: rect, cornerRadius: 2 * scale),
        with: .color(color)
      )
    }
    .frame(width: Self.designWidth * scale, height: Self.designHeight * scale)
  }
}
