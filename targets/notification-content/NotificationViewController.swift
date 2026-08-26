import UIKit
import SwiftUI
import UserNotifications
import UserNotificationsUI

/// Hosts the long-look match card.
///
/// ⚠ `NSExtensionPrincipalClass` in `Info.plist` names this class through
/// `$(PRODUCT_MODULE_NAME)`. Renaming the class or the target without changing
/// the other leaves iOS unable to instantiate anything, and the long look
/// silently falls back to the system default.
///
/// ⚠ **A payload this extension cannot parse must not produce an empty card.**
/// `UNNotificationExtensionDefaultContentHidden` is `true`, so if we draw
/// nothing the reader long-presses and gets a blank sheet with the title and
/// body suppressed. `unsupported` below is the floor under that.
class NotificationViewController: UIViewController, UNNotificationContentExtension {
  private var host: UIHostingController<AnyView>?

  override func viewDidLoad() {
    super.viewDidLoad()
    // The system's material is behind us; our own background would double it.
    view.backgroundColor = .clear
  }

  func didReceive(_ notification: UNNotification) {
    let info = notification.request.content.userInfo

    let root: AnyView = if let payload = Payload(info) {
      AnyView(MatchCard(payload: payload))
    } else {
      AnyView(unsupported(notification))
    }

    host?.willMove(toParent: nil)
    host?.view.removeFromSuperview()
    host?.removeFromParent()

    let controller = UIHostingController(rootView: root)
    controller.view.backgroundColor = .clear
    addChild(controller)
    controller.view.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(controller.view)
    NSLayoutConstraint.activate([
      controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      controller.view.topAnchor.constraint(equalTo: view.topAnchor),
      controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    controller.didMove(toParent: self)
    host = controller

    // ⚠ Let the card decide the height. The plist's initial ratio only covers
    // the moment before this runs; leaving it in charge crops long club names.
    preferredContentSize = controller.sizeThatFits(
      in: CGSize(width: view.bounds.width, height: .greatestFiniteMagnitude)
    )
  }

  /// An unknown `type` — a payload from a newer backend than this build.
  ///
  /// ⚠ Mirrors `routeFor`'s rule in `deep-link.ts`: an unrecognised type degrades
  /// to something harmless rather than throwing. Here that means putting the
  /// system's own title and body back on screen.
  private func unsupported(_ notification: UNNotification) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      Text(notification.request.content.title)
        .font(.system(size: 15, weight: .semibold))
        .foregroundStyle(Tok.ink)
      Text(notification.request.content.body)
        .font(.system(size: 15))
        .foregroundStyle(Tok.ink78)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 18)
    .padding(.vertical, 14)
  }
}
