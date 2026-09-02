import SwiftUI
import WidgetKit

/// A club crest, falling back to a lettered tile.
///
/// ⚠ **The tile is part of the design, not a failure state** — the same rule the
/// app's own `Crest` atom carries (`src/components/atoms/crest.tsx`). LaLiga is
/// the only league with full crest coverage; Bundesliga publishes SVG only and
/// Serie A publishes WebP, and neither decodes anywhere on this device. Those
/// clubs are *expected* here. Never invent artwork for a club that has none.
///
/// ⚠ Reads from the App Group container, never the network. The file was left
/// there by the service extension (server push), by the app at schedule time
/// (local reminder), or by the widget snapshot writer
/// (`src/features/widgets/crests.ts`). A `UIImage` load off disk is instant; a
/// fetch inside a content extension would draw an empty card and fill it in
/// later, or not — and inside a widget's timeline provider it is worse still,
/// because that process has a hard memory budget and no reliable network.
///
/// ⚠ **Shared across targets** — this file lives in `targets/_shared/`, so the
/// long-look card and both widgets draw crests through the same code and read
/// the same `crests/{fixtureId}/{slot}.png` layout. Changing that path is a
/// change to `crest-cache.ts` at the same time.
struct CrestView: View {
  let fixtureId: String?
  let slot: String
  let abbr: String
  let size: CGFloat

  /// Whether the fallback tile prints the abbreviation.
  ///
  /// ⚠⚠ **False wherever the SURFACE already draws the abbreviation beside the
  /// crest.** The Live Activity does — at 30pt, as the card's primary identifier
  /// — so a fixture with no cached crest rendered `ATH ATH`, logged as cosmetic
  /// in HANDOFF item 5 and guaranteed for every Bundesliga and Serie A club,
  /// whose crests are SVG and WebP and decode nowhere on this device.
  ///
  /// ⚠ Defaults to `true`, so every existing caller keeps the lettered tile that
  /// ADR 0047 made part of the design rather than a failure state.
  var showsAbbr: Bool = true

  /// How the FALLBACK tile is dressed. The artwork itself is never framed.
  ///
  /// ⚠⚠ **`.solid` is the default because this file compiles into the
  /// NOTIFICATION extensions too.** Those cards draw on the system's own
  /// material, where an unfilled tile has nothing behind it and reads as a
  /// missing element. Only the widgets, which own their whole rectangle and
  /// paint the mesh into it, ask for `.open`.
  enum Tone {
    /// Fill + ring. The long-look match card and the Live Activity.
    case solid
    /// Ring only — what the app's own `Crest` atom
    /// (`src/components/atoms/crest.tsx`) has always drawn by default; its
    /// `raised` fill is opt-in behind a `filled` prop that almost nothing sets.
    /// ADR 0104 brought the widgets onto it.
    case open
  }

  var tone: Tone = .solid

  var body: some View {
    if let image = loaded {
      artwork(image)
    } else {
      tile
    }
  }

  /// ⚠ **`.fullColor`, so a crest survives Tinted mode.** From iOS 18 the home
  /// screen can render a widget desaturated into one accent colour; club badges
  /// are the one thing on these tiles that must not be recoloured, and this is
  /// the opt-out. Harmless everywhere else — outside a widget render the
  /// modifier does nothing.
  @ViewBuilder
  private func artwork(_ image: UIImage) -> some View {
    if #available(iOS 18.0, *) {
      Image(uiImage: image)
        .resizable()
        .widgetAccentedRenderingMode(.fullColor)
        .scaledToFit()
        .frame(width: size, height: size)
    } else {
      Image(uiImage: image)
        .resizable()
        .scaledToFit()
        .frame(width: size, height: size)
    }
  }

  private var tile: some View {
    // Geometry from handoff_notifications/README.md — proportional to the tile
    // so one rule serves the 44pt reminder crest and the 34pt change-alert one.
    RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
      .fill(tone == .solid ? Tok.tile : Color.clear)
      .overlay(
        RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
          .strokeBorder(Tok.tileRing, lineWidth: 0.5)
      )
      .overlay {
        // ⚠ The ring and the fill stay when the letters go. An empty plate still
        // reads as "a badge we do not have"; nothing at all reads as a layout
        // bug, and the row's spacing would collapse.
        if showsAbbr {
          Text(abbr)
            .font(.system(size: size * 0.32, weight: .heavy))
            .foregroundStyle(Tok.tileInk)
            .minimumScaleFactor(0.7)
            .lineLimit(1)
            .padding(.horizontal, 2)
        }
      }
      .frame(width: size, height: size)
  }

  private var loaded: UIImage? {
    guard
      let fixtureId,
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: "group.com.altagamafc.app"
      )
    else { return nil }

    let url = container.appendingPathComponent("crests/\(fixtureId)/\(slot).png")
    guard let data = try? Data(contentsOf: url) else { return nil }
    return UIImage(data: data)
  }
}
