import UserNotifications

/// Attaches the composed crest plate to a server push before iOS displays it.
///
/// ⚠⚠ **This runs ONLY when the payload carries `mutable-content: 1`.** Without
/// that key iOS never instantiates this class, and there is no error, no log and
/// no fallback path to notice — the notification simply arrives bare. If crests
/// are missing in the field, check the payload before reading a line of Swift.
///
/// ⚠⚠ **It never runs for the kickoff reminder.** That notification is scheduled
/// locally, and a local notification cannot invoke a service extension at all.
/// Its artwork is attached at schedule time from a file the app already cached —
/// `src/features/push/crest-cache.ts`.
///
/// ⚠ **This file draws nothing.** Two of our four leagues cannot be rasterised
/// here: Bundesliga crests are SVG and Serie A's are WebP, and there is no
/// decoder for either in the system frameworks. `senpai-backend` composites the
/// plate — including the lettered fallback tile — and this only downloads it.
class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    let content = request.content.mutableCopy() as? UNMutableNotificationContent
    self.bestAttempt = content

    guard let content else {
      contentHandler(request.content)
      return
    }

    let info = content.userInfo
    let fixtureId = info["fixtureId"] as? String

    // ⚠ The app group is the ONLY channel to the content extension. It is a
    // separate process and cannot read this one's container.
    if let fixtureId {
      cacheLongLookCrests(
        fixtureId: fixtureId,
        home: info["homeCrestUrl"] as? String,
        away: info["awayCrestUrl"] as? String
      )
    }

    guard
      let pair = info["crestPairUrl"] as? String,
      let url = URL(string: pair)
    else {
      contentHandler(content)
      return
    }

    download(url) { [weak self] file in
      guard let self else { return }
      if let file, let attachment = Self.attachment(from: file) {
        content.attachments = [attachment]
      }
      // ⚠ Always deliver. A failed download costs the artwork, never the alert.
      self.contentHandler?(content)
      self.contentHandler = nil
    }
  }

  /// ⚠ **The 30-second budget expired.** Deliver whatever we have — if this does
  /// not fire the handler, iOS shows the ORIGINAL payload and the work is lost.
  override func serviceExtensionTimeWillExpire() {
    if let contentHandler, let bestAttempt {
      contentHandler(bestAttempt)
    }
    contentHandler = nil
  }

  // MARK: - Attachment

  /// ⚠ `UNNotificationAttachment` **moves** the file it is handed, so this must
  /// point at a throwaway path in the extension's own temporary directory. It is
  /// also why the file needs a real `.png` suffix: iOS types the attachment from
  /// the extension, and an untyped file is dropped without a word.
  private static func attachment(from file: URL) -> UNNotificationAttachment? {
    let named = file.deletingLastPathComponent().appendingPathComponent("crest.png")
    try? FileManager.default.removeItem(at: named)
    do {
      try FileManager.default.moveItem(at: file, to: named)
      return try UNNotificationAttachment(
        identifier: "crest",
        url: named,
        options: [UNNotificationAttachmentOptionsTypeHintKey: "public.png"]
      )
    } catch {
      return nil
    }
  }

  private func download(_ url: URL, completion: @escaping (URL?) -> Void) {
    let task = URLSession.shared.downloadTask(with: url) { location, response, _ in
      let code = (response as? HTTPURLResponse)?.statusCode ?? 0
      guard let location, (200..<300).contains(code) else {
        completion(nil)
        return
      }
      completion(location)
    }
    task.resume()
  }

  // MARK: - App group

  /// Leave the two single crests where the long-look card can read them off disk.
  ///
  /// ⚠ Fire-and-forget on purpose — the card must never wait on this, and it has
  /// a lettered tile to fall back on. Blocking the handler for artwork the reader
  /// may never long-press would delay every notification.
  private func cacheLongLookCrests(fixtureId: String, home: String?, away: String?) {
    guard
      let container = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: "group.com.altagamafc.app"
      )
    else { return }

    let dir = container.appendingPathComponent("crests/\(fixtureId)", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

    for (slot, raw) in [("home", home), ("away", away)] {
      guard let raw, let url = URL(string: raw) else { continue }
      let destination = dir.appendingPathComponent("\(slot).png")
      if FileManager.default.fileExists(atPath: destination.path) { continue }

      download(url) { location in
        guard let location else { return }
        try? FileManager.default.moveItem(at: location, to: destination)
      }
    }
  }
}
