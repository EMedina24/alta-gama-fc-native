import SwiftUI
import WidgetKit

/// ⚠ **The entry point.** A WidgetKit extension has no principal class — this
/// `@main` is it, and `Info.plist` deliberately carries no
/// `NSExtensionPrincipalClass`. Both widgets share `FixtureProvider` and
/// `SelectClubIntent`; they differ only in the families they support and what
/// they draw.
@main
struct AltaGamaWidgetBundle: WidgetBundle {
  var body: some Widget {
    NextFixtureWidget()
    YourWeekWidget()
    // ⚠⚠ **Gated HERE rather than by raising the target's `deploymentTarget`.**
    // The broadcast channel a Live Activity subscribes to is iOS 18; the two
    // widgets above are 17.0 on purpose (ADR 0047), and lifting the whole target
    // to 18 to accommodate this one member would silently take the widgets away
    // from every iOS 17 reader. ⚠ `.claude/LIVE-ACTIVITIES.md` and ADR 0054 both
    // say to raise the floor — that is wrong, and ADR 0055 corrects it.
    if #available(iOS 18.0, *) {
      MatchActivity()
    }
  }
}
