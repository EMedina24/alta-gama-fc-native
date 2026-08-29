import ActivityKit
import ExpoModulesCore

/// Reports this device's ActivityKit **push-to-start** token (ADR 0055/0056).
///
/// ⚠⚠ **This module does NOT start, update or end an activity, and it never
/// will.** The server does all three: it push-to-starts the activity at kickoff
/// and publishes every update to a broadcast channel the activity subscribes to
/// itself. Nobody opens the app at kickoff, so an app-side `Activity.request`
/// would only ever fire for a reader already watching the match — which is the
/// one case that does not need a Lock Screen card.
///
/// ⚠ So the whole app-side surface is: *hand the server one token*. Everything
/// else about this feature lives in `senpai-backend` and in
/// `targets/widget/MatchActivity.swift`.
///
/// ⚠ **Nothing here logs the token.** Same rule as the APNs device token: it is
/// a credential, and a log line is where credentials leak.
public class LiveActivityModule: Module {
  /// The most recent token, or nil.
  ///
  /// ⚠ Cached because the AsyncSequence below emits ONCE per rotation and JS may
  /// not be listening yet at that moment — the observation starts on module
  /// creation, which is before the first React render. Without this the app
  /// misses its own token on a cold launch and never registers one.
  private var latestToken: String?

  private var observer: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("LiveActivity")

    Events("onPushToStartToken")

    /// Whether this device can show a match Live Activity AT ALL.
    ///
    /// ⚠ Two independent gates and both are real: iOS 18 for the broadcast
    /// channel the activity subscribes to, and the reader's own system setting,
    /// which is per-app and off-able in Settings at any time. A device that fails
    /// either keeps the ADR 0053 banners and gets no card.
    Function("isSupported") { () -> Bool in
      guard #available(iOS 18.0, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    /// The cached token, for the cold-launch registration path.
    ///
    /// ⚠ Returns nil rather than throwing on a simulator, an older OS, or before
    /// the first emission — the caller treats "no token" as "nothing to
    /// register", which is the truth. Same posture as `getDeviceToken()`.
    Function("getPushToStartToken") { () -> String? in
      return self.latestToken
    }

    /// ⚠ **Starts on module creation, not on first subscribe.** See `latestToken`.
    OnCreate { self.startObserving() }

    OnDestroy {
      self.observer?.cancel()
      self.observer = nil
    }
  }

  private func startObserving() {
    guard #available(iOS 18.0, *) else { return }
    guard observer == nil else { return }

    observer = Task { [weak self] in
      // ⚠ `pushToStartTokenUpdates` is per DEVICE and per ACTIVITY TYPE — not per
      // activity. That is what makes it a column on `device_tokens` rather than a
      // table, and it is why the token survives every match. It rotates on
      // reinstall and on restore, exactly like the APNs device token.
      for await data in Activity<MatchAttributes>.pushToStartTokenUpdates {
        // ⚠ Lowercase hex. The backend validates the shape and an uppercase
        // token is a 400 on every registration — silent, total loss of the
        // feature for this device.
        let token = data.map { String(format: "%02x", $0) }.joined()
        guard let self else { return }
        self.latestToken = token
        self.sendEvent("onPushToStartToken", ["token": token])
      }
    }
  }
}
