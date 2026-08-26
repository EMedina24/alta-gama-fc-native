import SwiftUI

/// A club crest, falling back to a lettered tile.
///
/// ⚠ **The tile is part of the design, not a failure state** — the same rule the
/// app's own `Crest` atom carries (`src/components/atoms/crest.tsx`). LaLiga is
/// the only league with full crest coverage; Bundesliga publishes SVG only and
/// Serie A publishes WebP, and neither decodes anywhere on this device. Those
/// clubs are *expected* here. Never invent artwork for a club that has none.
///
/// ⚠ Reads from the App Group container, never the network. The file was left
/// there by the service extension (server push) or by the app at schedule time
/// (local reminder). A `UIImage` load off disk is instant; a fetch inside a
/// content extension would draw an empty card and fill it in later, or not.
struct CrestView: View {
  let fixtureId: String?
  let slot: String
  let abbr: String
  let size: CGFloat

  var body: some View {
    if let image = loaded {
      Image(uiImage: image)
        .resizable()
        .scaledToFit()
        .frame(width: size, height: size)
    } else {
      tile
    }
  }

  private var tile: some View {
    // Geometry from handoff_notifications/README.md — proportional to the tile
    // so one rule serves the 44pt reminder crest and the 34pt change-alert one.
    RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
      .fill(Tok.tile)
      .overlay(
        RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
          .strokeBorder(Tok.tileRing, lineWidth: 0.5)
      )
      .overlay(
        Text(abbr)
          .font(.system(size: size * 0.32, weight: .heavy))
          .foregroundStyle(Tok.tileInk)
          .minimumScaleFactor(0.7)
          .lineLimit(1)
          .padding(.horizontal, 2)
      )
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
