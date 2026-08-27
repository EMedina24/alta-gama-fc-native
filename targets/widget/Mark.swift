import SwiftUI

/// The Alta Gama FC pitch mark.
///
/// ⚠ **Drawn, not imported.** `handoff_AG-ios/brand/mark-accent.svg` is the
/// source of these coordinates (42×30 viewBox, 2.5 stroke), transcribed rather
/// than rasterised into an asset catalog. A PNG renders fine on the home screen
/// but is flattened to a mask on the Lock Screen and under iOS 18's tinted
/// rendering, where a stroked path keeps its geometry and its line weight.
///
/// ⚠ The two goal boxes deliberately run off the left and right edges — that is
/// how the SVG is drawn (`M0 8.25H4.75…`), and clipping them to the frame closes
/// the shape into a box with two notches, which is a different mark.
struct Mark: View {
  var size: CGFloat = 16
  var color: Color = Tok.accent

  private static let designWidth: CGFloat = 42
  private static let designHeight: CGFloat = 30

  var body: some View {
    let scale = size / Self.designWidth
    let height = Self.designHeight * scale

    Canvas { context, _ in
      var path = Path()
      let s = { (x: CGFloat, y: CGFloat) in CGPoint(x: x * scale, y: y * scale) }

      // The touchline.
      path.addRoundedRect(
        in: CGRect(
          origin: s(1.25, 1.25),
          size: CGSize(width: 39.5 * scale, height: 27.5 * scale)
        ),
        cornerSize: CGSize(width: 4.75 * scale, height: 4.75 * scale)
      )

      // The halfway line, broken around the centre circle.
      path.move(to: s(21, 1.25));  path.addLine(to: s(21, 8.5))
      path.move(to: s(21, 21.5));  path.addLine(to: s(21, 28.75))

      // The two goal boxes.
      path.move(to: s(0, 8.25))
      path.addLine(to: s(4.75, 8.25))
      path.addLine(to: s(4.75, 21.75))
      path.addLine(to: s(0, 21.75))

      path.move(to: s(42, 8.25))
      path.addLine(to: s(37.25, 8.25))
      path.addLine(to: s(37.25, 21.75))
      path.addLine(to: s(42, 21.75))

      // The centre circle.
      path.addEllipse(in: CGRect(
        origin: s(15.75, 9.75),
        size: CGSize(width: 10.5 * scale, height: 10.5 * scale)
      ))

      context.stroke(path, with: .color(color), lineWidth: 2.5 * scale)
    }
    .frame(width: size, height: height)
    // ⚠ The mark is decoration beside a label that already says what this is.
    .accessibilityHidden(true)
  }
}
