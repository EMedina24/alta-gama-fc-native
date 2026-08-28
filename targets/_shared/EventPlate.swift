import UIKit

/// The 38×38 attachment plate on a live match alert (ADR 0053).
///
/// ⚠⚠ **DRAWN HERE, not downloaded.** Every other notification attachment in
/// this app is a PNG the backend composited, because two of our four leagues
/// publish crests this device cannot rasterise (Bundesliga SVG, Serie A WebP —
/// see `NotificationService.swift`). None of that applies to a glyph: it is a
/// handful of vectors in our own colours, identical for every club, and asking
/// a server for it would add a route, a fetch and a failure mode to a shape we
/// can draw in a millisecond. The live alert design is crest-free by intention.
///
/// ⚠ **UIKit and CoreGraphics, not SwiftUI.** A notification attachment is a
/// FILE, so this has to produce a `UIImage` — there is no view hierarchy to
/// hand SwiftUI. That is also why `Tokens.swift` carries `plate*` UIColors
/// beside its SwiftUI ones.
///
/// ⚠ Geometry is transcribed from `src/components/atoms/event-glyph.tsx`, which
/// draws the same marks in the match-events timeline. Keep them the same shape:
/// a reader who taps a goal alert lands on a timeline drawing that goal, and two
/// different balls would read as two different things.
enum EventPlate {
  /// Design: 38×38, radius 9.
  private static let side: CGFloat = 38
  private static let radius: CGFloat = 9

  /// Which mark the plate carries. Full time gets none — see `image(for:)`.
  enum Kind {
    case goal
    case redCard
  }

  /// The plate as a PNG, or nil if the category carries no attachment.
  ///
  /// ⚠ Returns `Data`, not a file: the caller owns where it lands, because
  /// `UNNotificationAttachment` MOVES the file it is handed and the path has to
  /// be a throwaway in the extension's own temporary directory.
  static func png(for kind: Kind) -> Data? {
    let renderer = UIGraphicsImageRenderer(
      size: CGSize(width: side, height: side),
      format: {
        let format = UIGraphicsImageRendererFormat.preferred()
        // ⚠ Opaque would paint black behind the wash. The notification's own
        // material shows through the plate, which is the whole look.
        format.opaque = false
        return format
      }()
    )

    let image = renderer.image { context in
      draw(kind: kind, in: context.cgContext)
    }
    return image.pngData()
  }

  private static func draw(kind: Kind, in ctx: CGContext) {
    let bounds = CGRect(x: 0, y: 0, width: side, height: side)
    let wash = kind == .goal ? Tok.plateAccentWash : Tok.plateRedWash
    let ring = kind == .goal ? Tok.plateAccentRing : Tok.plateRedRing

    // The plate: a wash, then a hairline ring inset by half its own width so
    // the stroke sits INSIDE the 38pt box rather than straddling its edge.
    let plate = UIBezierPath(roundedRect: bounds, cornerRadius: radius)
    ctx.setFillColor(wash.cgColor)
    plate.fill()

    let hairline: CGFloat = 1
    let ringPath = UIBezierPath(
      roundedRect: bounds.insetBy(dx: hairline / 2, dy: hairline / 2),
      cornerRadius: radius - hairline / 2
    )
    ctx.setStrokeColor(ring.cgColor)
    ringPath.lineWidth = hairline
    ringPath.stroke()

    switch kind {
    case .goal: drawGoal(in: ctx)
    case .redCard: drawCard(in: ctx)
    }
  }

  /// The struck ball: a disc, a dark pentagon, three speed trails.
  ///
  /// ⚠ The source viewBox is `0 0 24 20` (event-glyph.tsx). The design asks for
  /// a 21×18 glyph centred in the plate, so the transcribed coordinates are
  /// scaled by 21/24 and offset — rather than re-measured, which is how the two
  /// drawings drift apart.
  private static func drawGoal(in ctx: CGContext) {
    let scale: CGFloat = 21.0 / 24.0
    let originX = (side - 24 * scale) / 2
    let originY = (side - 20 * scale) / 2
    let point = { (x: CGFloat, y: CGFloat) in
      CGPoint(x: originX + x * scale, y: originY + y * scale)
    }

    // Circle(cx: 15.2, cy: 10, r: 8)
    let centre = point(15.2, 10)
    let r = 8 * scale
    ctx.setFillColor(Tok.plateAccent.cgColor)
    ctx.fillEllipse(
      in: CGRect(x: centre.x - r, y: centre.y - r, width: r * 2, height: r * 2)
    )

    // PENTAGON: M15.2 6.1 l3.71 2.7 -1.42 4.36 h-4.58 L11.49 8.8 z
    let pentagon = UIBezierPath()
    pentagon.move(to: point(15.2, 6.1))
    pentagon.addLine(to: point(18.91, 8.8))
    pentagon.addLine(to: point(17.49, 13.16))
    pentagon.addLine(to: point(12.91, 13.16))
    pentagon.addLine(to: point(11.49, 8.8))
    pentagon.close()
    ctx.setFillColor(Tok.plateOnAccent.cgColor)
    pentagon.fill()

    // TRAILS: M1.1 10 h4.5 · M3 6.6 h3.4 · M3 13.4 h3.4
    let trails = UIBezierPath()
    for (x, y, length) in [(1.1, 10.0, 4.5), (3.0, 6.6, 3.4), (3.0, 13.4, 3.4)] {
      trails.move(to: point(CGFloat(x), CGFloat(y)))
      trails.addLine(to: point(CGFloat(x + length), CGFloat(y)))
    }
    trails.lineWidth = 1.6 * scale
    trails.lineCapStyle = .round
    ctx.setStrokeColor(Tok.plateAccent.cgColor)
    trails.stroke()
  }

  /// The card: one rounded rectangle, the same 11×15 viewBox the timeline uses.
  private static func drawCard(in ctx: CGContext) {
    let scale: CGFloat = 18.0 / 15.0
    let originX = (side - 11 * scale) / 2
    let originY = (side - 15 * scale) / 2

    // Rect(x: 1.5, y: 1.6, w: 8, h: 11.4, rx: 2)
    let rect = CGRect(
      x: originX + 1.5 * scale,
      y: originY + 1.6 * scale,
      width: 8 * scale,
      height: 11.4 * scale
    )
    let card = UIBezierPath(roundedRect: rect, cornerRadius: 2 * scale)
    ctx.setFillColor(Tok.plateRed.cgColor)
    card.fill()
  }
}
