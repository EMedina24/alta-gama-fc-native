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
  }
}
