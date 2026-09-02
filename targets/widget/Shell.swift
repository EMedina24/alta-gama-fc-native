import SwiftUI
import WidgetKit

/// The app's shell, at widget scale (ADR 0104).
///
/// ⚠⚠ **The whole reason this file exists: `targets/` was held OUT of the visual
/// rework.** ADR 0087 §10 kept the widgets on their floodlight plate and their
/// old `#0a0b0c` ground while every screen in the app moved to a lit mesh under
/// translucent glass. 0104 closes that gap, and these two views are the
/// transfer: the ground, and the card that sits on it.
///
/// ⚠⚠ **`SwiftUI.glassEffect()` DOES NOT WORK IN A WIDGET, and it fails
/// silently by erasing its own content.** This was built with real glass on iOS
/// 26 and the painted blend below it; on the iOS 26.5 simulator the entire
/// modified subtree rendered as NOTHING — the YOUR WEEK rail column and the NEXT
/// live ledger vanished, text and all, while the eyebrow and footnote around
/// them drew normally. Isolated to a bare
/// `content.glassEffect(.clear, in: shape)` with no scrim, ring or overlay: same
/// blank. It compiles, it typechecks at every floor, it draws nothing.
///
/// The mechanism is almost certainly that a widget is rendered out of process
/// into an ARCHIVE and composited later, while `glassEffect` is a live backdrop
/// filter that needs a real rendering context and a real backdrop to sample. A
/// widget has neither. Nothing in any log says so.
///
/// ⚠ So this is ONE painted path at every iOS version — `glassFill` + a 0.5pt
/// `glassLine`, which is what most of the app itself draws anyway; only
/// `club-bubble.tsx` and `next-up-card.tsx` use a real `GlassView`, and both are
/// in-process views inside the app. Do not "restore" the glass branch on a
/// newer SDK without re-running the check: the failure is invisible in code
/// review, in the typechecker, and in the build.
///
/// ⚠ **Every surface here is decoration.** Nothing may encode liveness, the
/// followed side, or how many fixtures there are — the same rule the old `Plate`
/// carried. The moment a reader can learn something from the light, the light has
/// to be correct, and a widget's light is a snapshot.

// MARK: - Ground

/// The aurora mesh: `Tok.ground` under theme.ts's three static `MeshTile` pools.
///
/// ⚠ **`MeshTile`, not `Mesh`** — see `Tok.mesh` for why copying the app's own
/// table verbatim renders a dead tile.
///
/// ⚠⚠ **`.position` inside a `GeometryReader`, NOT `EllipticalGradient`'s own
/// `center:`/`endRadiusFraction:`.** The pools have INDEPENDENT `rx`/`ry`
/// (`0.72 × 0.62`, `0.70 × 0.76`, `0.78 × 0.68`); SwiftUI's elliptical gradient
/// fits its ellipse to the view's own aspect and takes a single radius fraction,
/// so it cannot express any of them. Sizing the gradient's FRAME to `2rx × 2ry`
/// and positioning that frame's centre at `cx, cy` reproduces the SVG exactly —
/// the default `endRadiusFraction` of 0.5 is precisely "fill this frame's
/// inscribed ellipse". This is the same substitution ADR 0085/0086 record for
/// `RadialGradient`, resolved rather than approximated.
///
/// ⚠ Two pools are still centred slightly OFF the tile (`cx` −0.02, `cy` 1.02).
/// That is the design — they are the edges of a larger wash — and it is why this
/// clips.
struct MeshPlate: View {
  /// ⚠⚠ **Tinted and vibrant modes get NO ground of ours.** In `.accented`
  /// (iOS 18+ tinted home screen) and `.vibrant` (Lock Screen) the system
  /// flattens every colour to one tint and supplies its own backing; painting a
  /// three-pool mesh into that renders as grey mush and hides the type. Handing
  /// back `Color.clear` is what lets the system draw what it means to.
  @Environment(\.widgetRenderingMode) private var mode

  var body: some View {
    if mode == .fullColor {
      Tok.ground
        .overlay { pools }
        // The lit top edge every glass card in the app carries. A 1pt rule, not
        // a stroked rounded rect: the tile's corner is the SYSTEM's, and a
        // second radius inside that mask double-rounds it (ADR 0085 §1).
        .overlay(alignment: .top) {
          Rectangle().fill(Tok.plateTop).frame(height: 1)
        }
    } else {
      Color.clear
    }
  }

  private var pools: some View {
    GeometryReader { geo in
      ZStack {
        ForEach(Array(Tok.mesh.enumerated()), id: \.offset) { _, pool in
          EllipticalGradient(
            gradient: Gradient(stops: [
              .init(color: pool.color.opacity(pool.alpha), location: 0),
              .init(color: pool.color.opacity(0), location: pool.fade),
            ]),
            center: .center,
            startRadiusFraction: 0,
            endRadiusFraction: 0.5
          )
          .frame(
            width: geo.size.width * pool.rx * 2,
            height: geo.size.height * pool.ry * 2
          )
          .position(
            x: geo.size.width * pool.cx,
            y: geo.size.height * pool.cy
          )
        }
      }
    }
    .clipped()
  }
}

// MARK: - Glass

/// One glass surface — the app's `Surfaces.glass` card, at widget scale.
///
/// ⚠ **No padding of its own.** It sizes to its content, exactly as spreading
/// `...Surfaces.glass` onto a `View` does in the app, so each call site keeps
/// the padding its own layout was measured with.
struct GlassSurface<Content: View>: View {
  @Environment(\.widgetRenderingMode) private var mode

  /// Which `Radius` this surface is. Never the tile's own corner — see `Rad`.
  var radius: CGFloat = Rad.tile

  /// The quiet slab (`glassFillDim` .05 rather than `glassFill` .06), for a
  /// track or a secondary column rather than a card.
  var dim: Bool = false

  /// A coloured ring instead of the neutral hairline — in practice `accentRing`.
  ///
  /// ⚠ **1pt when it is a ring, 0.5pt when it is the neutral hairline**, and the
  /// difference is recorded: ADR 0096 found that at 0.5pt the lime ring stops
  /// reading as one object against the mesh.
  var ring: Color? = nil

  /// Drop the surface a step darker under the fill — theme.ts `recess`. ADR
  /// 0096's "a bit darker": a panel must sit BELOW the ground around it, or the
  /// two read as the same plane. On a lit mesh a translucent white fill alone
  /// does not recess anything; the black scrim underneath is what does.
  var scrim: Bool = false

  private let content: Content

  init(
    radius: CGFloat = Rad.tile,
    dim: Bool = false,
    ring: Color? = nil,
    scrim: Bool = false,
    @ViewBuilder content: () -> Content
  ) {
    self.radius = radius
    self.dim = dim
    self.ring = ring
    self.scrim = scrim
    self.content = content()
  }

  private var shape: RoundedRectangle {
    RoundedRectangle(cornerRadius: radius, style: .continuous)
  }

  var body: some View {
    // ⚠ Same rule as `MeshPlate`: in a tinted or vibrant render the system owns
    // the surface, and a fill of ours only muddies it.
    if mode != .fullColor {
      content
    } else {
      content
        .modifier(Scrim(shape: shape, on: scrim))
        .background(shape.fill(dim ? Tok.glassFillDim : Tok.glassFill))
        .overlay {
          shape.strokeBorder(ring ?? Tok.glassLine, lineWidth: ring == nil ? 0.5 : 1)
        }
        // The lit top edge, clipped to the surface's own corner and fading out
        // down the sides — a stroked rounded rect lit all the way round reads as
        // an outline rather than as light landing on a top edge.
        .overlay {
          shape.stroke(Tok.plateTop, lineWidth: 1)
            .mask(alignment: .top) {
              LinearGradient(
                colors: [.white, .white.opacity(0)],
                startPoint: .top,
                endPoint: .bottom
              )
              .frame(height: radius)
              .frame(maxHeight: .infinity, alignment: .top)
            }
        }
    }
  }
}

/// The `recess` step, kept as a modifier so the call site stays one expression.
private struct Scrim: ViewModifier {
  let shape: RoundedRectangle
  let on: Bool

  func body(content: Content) -> some View {
    if on {
      content.background(shape.fill(Tok.recess))
    } else {
      content
    }
  }
}

// MARK: - Photographs

extension Image {
  /// ⚠ **Keeps a photograph in colour under Tinted rendering.** From iOS 18 the
  /// home screen can render a widget desaturated into a single accent; a press
  /// photo or a club badge recoloured that way stops being the thing it is. Same
  /// opt-out `CrestView` applies to artwork, spelled once here for `NewsWidget`.
  ///
  /// ⚠ Call it on the `Image`, BEFORE `scaledToFit`/`scaledToFill` — the
  /// modifier is declared on `Image` and the scaling modifiers erase the type.
  @ViewBuilder
  func fullColorInWidget() -> some View {
    if #available(iOS 18.0, *) {
      widgetAccentedRenderingMode(.fullColor)
    } else {
      self
    }
  }
}
