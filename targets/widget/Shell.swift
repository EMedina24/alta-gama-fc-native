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
/// ⚠ **The one real glass these tiles ever get is the SYSTEM's** (ADR 0114): on
/// an iOS 26 Clear or iOS 18 Tinted home screen the system removes the
/// container background and renders the widget on its own glass slab, tinting
/// unaccented content white at its own opacity. `MeshPlate` hands that mode
/// nothing; `GlassSurface` keeps only its fill and hairline there — see
/// `accented` below for why each of the other layers has to go.
///
/// ⚠ **Every surface here is decoration.** Nothing may encode liveness, the
/// followed side, or how many fixtures there are — the same rule the old `Plate`
/// carried. The moment a reader can learn something from the light, the light has
/// to be correct, and a widget's light is a snapshot.

// MARK: - Ground

/// The TRAY SHELL (ADR 0128, `handoff_widget-redo/`): a `trayFill` tray at the
/// tile's edge, a `plate` centre inset 2pt inside it, a lit top edge on the
/// plate, and a lime corner glow. One view, all three widgets.
///
/// ⚠ **The aurora pools this view was named for are GONE** (0125), and so is
/// the flat black that followed them (0126). The name stays because ADRs and
/// comments across this target refer to `MeshPlate`; the pool table
/// (`Tok.mesh`) survives only for the Live Activity's floodlight. Do not
/// re-attach it here.
///
/// ⚠⚠ **No radius here is OURS.** The tile's corner is the SYSTEM's, and a
/// second radius inside its mask double-rounds every edge (ADR 0085 §1). The
/// tray corner is therefore the container mask itself (the fill runs
/// edge-to-edge and the system rounds it), and every inner corner is
/// `ContainerRelativeShape().inset(by: 2)` — an `InsettableShape`, so the
/// plate's corner stays concentric with the container's on every device,
/// which is the handoff's "radii stay concentric at any size" without ever
/// writing 23 or 21.
///
/// ⚠ `ContainerRelativeShape` resolves the container's corner ONLY inside a
/// widget context (elsewhere it degrades to a rectangle) — safe here because
/// this view draws only as `containerBackground`.
struct MeshPlate: View {
  /// ⚠⚠ **Tinted and vibrant modes get NO ground of ours.** In `.accented`
  /// (iOS 18+ tinted home screen) and `.vibrant` (Lock Screen) the system
  /// flattens every colour to one tint and supplies its own backing; painting
  /// a tray-and-glow shell into that renders as grey mush and hides the type.
  /// Handing back `Color.clear` is what lets the system draw what it means to.
  @Environment(\.widgetRenderingMode) private var mode

  private var plateShape: some InsettableShape {
    ContainerRelativeShape().inset(by: 2)
  }

  var body: some View {
    if mode == .fullColor {
      // ⚠ `trayFill` is opaque BY MEASUREMENT, not habit: container-background
      // alpha composites over BLACK, never the wallpaper (ADR 0114), so the
      // mock's `white 5%` is pre-composited into `#17191b` — see the token.
      // See-through is the SYSTEM's Clear/Tinted modes alone.
      ZStack {
        Tok.trayFill
        plateShape.fill(Tok.plate)
        // Decoration only — never a data channel (the old `Plate`'s rule).
        CornerGlow()
          .clipShape(plateShape)
        // The plate's lit top edge — the mock's 0.5px inset highlight. Stroked
        // on the INSET shape and masked to a top fade (GlassSurface's idiom),
        // so it follows the plate's corner instead of ruling straight across
        // the tray.
        plateShape
          .strokeBorder(Tok.hairline, lineWidth: 0.5)
          .mask(alignment: .top) {
            LinearGradient(
              colors: [.white, .white.opacity(0)],
              startPoint: .top,
              endPoint: .bottom
            )
            .frame(height: 21)
            .frame(maxHeight: .infinity, alignment: .top)
          }
        // The tray's own hairline, on the container's edge — the outermost
        // stroke, drawn last so the plate never overlaps it.
        ContainerRelativeShape()
          .strokeBorder(Tok.trayLine, lineWidth: 0.5)
      }
    } else {
      Color.clear
    }
  }
}

/// The handoff's corner glow: the mock's
/// `radial-gradient(58% 78% at 100% −10%, lime .16 → clear 64%)`.
///
/// ⚠ `EllipticalGradient` cannot take independent rx/ry through
/// `endRadiusFraction` (trap 50) — so this is the ADR 0104 recipe: size the
/// gradient's own frame to `2rx × 2ry`, `.position` its centre at the mock's
/// `(100%, −10%)`, and let the default fraction 0.5 mean "fill this frame's
/// inscribed ellipse". The centre is legitimately OUTSIDE the surface, so the
/// caller clips.
private struct CornerGlow: View {
  var body: some View {
    GeometryReader { geo in
      let w = geo.size.width
      let h = geo.size.height
      EllipticalGradient(
        stops: [
          .init(color: Tok.accent.opacity(0.16), location: 0),
          .init(color: Tok.accent.opacity(0), location: 0.64),
        ]
      )
      .frame(width: 2 * 0.58 * w, height: 2 * 0.78 * h)
      .position(x: w, y: -0.10 * h)
    }
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
    if mode == .fullColor {
      full
    } else if mode == .accented {
      accented
    } else {
      // ⚠ Vibrant (the Lock Screen) still gets nothing of ours: the system
      // renders those families into a single material, and a fill only muddies
      // it — `MeshPlate`'s rule, unchanged from ADR 0104.
      content
    }
  }

  /// The panel under the SYSTEM's glass — iOS 18 Tinted, iOS 26 Clear
  /// (ADR 0114). Fill and hairline only, and each omission is deliberate:
  /// the system tints unaccented content white AT ITS OWN OPACITY, so the
  /// white-alpha fill and line survive as themselves, while the black `recess`
  /// scrim would tint to white .28 and LIGHTEN the panel it exists to sink, a
  /// colored ring would tint to plain white anyway, and the lit top edge is
  /// the system glass's own job — it lights its slab, and a second painted
  /// light reads as a smudge on it.
  private var accented: some View {
    content
      .background(shape.fill(dim ? Tok.glassFillDim : Tok.glassFill))
      .overlay {
        shape.strokeBorder(Tok.glassLine, lineWidth: 0.5)
      }
  }

  private var full: some View {
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
