import ActivityKit
import Foundation

/// The Live Activity contract (ADR 0055).
///
/// ⚠⚠ **This file is compiled into TWO binaries and they are built by different
/// tools.** `@bacons/apple-targets` links `targets/_shared/` into every target,
/// which is how the widget extension gets it; the APP target gets it because
/// `modules/live-activity/ios/LiveActivity.podspec` reaches back up to this
/// folder. Those are unrelated mechanisms pointed at one file, on purpose —
/// `ActivityAttributes` has to be the SAME type in the process that reads the
/// push-to-start token and the process that draws the card, and a hand-copied
/// second declaration is a card that silently never updates (trap 15's shape,
/// with no visible drift to catch it).
///
/// ⚠ **Not gated.** `ActivityAttributes` is iOS 16.1 and the app's floor is 16.4
/// (`ios/Podfile`), so the type compiles everywhere. Only the iOS 18 broadcast
/// channel API is `@available`-gated, at its call sites.
///
/// ⚠⚠ **EVERY STRING IN HERE ARRIVES PRE-LOCALISED, and that is not a shortcut.**
/// This type is drawn by the WIDGET extension, which renders in the SYSTEM
/// language and cannot see the language the reader chose inside the app — so
/// `.lproj` files here would hand an English card to a Spanish reader on an
/// English phone, which is the precise bug ADR 0047 kept out of the widgets.
/// The widgets solve it by pre-resolving copy into the App Group snapshot; a
/// Live Activity has no snapshot, but its content comes from a server push and
/// the server already knows `device_tokens.lang` — so it resolves the copy, the
/// same way it already does for every push string. ⚠ **Do not add a `.lproj` to
/// `targets/widget/`.**
///
/// ⚠ **`ContentState` is the wire format of `aps.content-state`** and its mirror
/// is `senpai-backend/src/cronogol/live-activity.mapper.ts`. A field added here
/// and not there is a nil on the card; added there and not here is a decode
/// failure that drops the whole update. Codable keys are the JSON keys — do not
/// rename either side alone.
struct MatchAttributes: ActivityAttributes {
  /// What the card is showing right now. Replaced wholesale by every push.
  struct ContentState: Codable, Hashable {
    /// ⚠ `nil` is "not reported", never 0. A not-started match reporting 0 is a
    /// real observed provider behaviour and storing it draws every upcoming
    /// fixture as a 0–0 draw — the same rule `LiveMatchState` documents.
    var homeGoals: Int?
    var awayGoals: Int?

    /// `scheduled` · `first_half` · `half_time` · `second_half` · `finished`.
    ///
    /// ⚠ A `String` rather than an enum, deliberately: a phase the backend grows
    /// later must degrade to "draw the score without a phase pill", never to a
    /// decode failure that discards the score with it.
    var phase: String

    /// The minute to PRINT when the running clock cannot be drawn — `HT`, `FT`,
    /// or a fallback where the feed has a minute but `clockFrom` is nil.
    ///
    /// ⚠⚠ **In play this is nil and the clock is drawn, not pushed.** Pushing a
    /// per-minute update is the way to exhaust Apple's update budget inside one
    /// half, and it is the single most likely way to get this feature wrong.
    var minuteLabel: String?

    /// The instant `Text(timerInterval:)` counts up from, or nil to stop the clock.
    ///
    /// ⚠⚠ **NOT kickoff, and this is the whole subtlety.** A timer anchored to
    /// kickoff counts the half-time break too, so it reads ~60:00 during the 46th
    /// minute and is wrong for the entire second half. The server instead sends a
    /// SYNTHETIC instant — `now − (matchMinute × 60)` — recomputed on every push,
    /// so elapsed-since-anchor always equals the minute the feed reported and the
    /// card counts on correctly between pushes.
    ///
    /// ⚠ Nil at half time, full time and before kick-off: a running clock is a
    /// claim that play is happening. `minuteLabel` carries the text in those
    /// states.
    ///
    /// ⚠ The drift this leaves is bounded by the poll interval (~30s) and is
    /// re-anchored by the next goal. That is the correct trade against pushing
    /// a tick.
    ///
    /// ⚠⚠ **UNIX EPOCH SECONDS, NOT A `Date`, and this is not a style choice.**
    /// `JSONDecoder`'s default date strategy is `.deferredToDate`, which expects
    /// a NUMBER of seconds since 2001 — not an ISO 8601 string. ActivityKit
    /// decodes this state itself and does not document its strategy, so a `Date`
    /// field against an ISO string is a decode failure, and a decode failure
    /// drops the ENTIRE update, score included, with no error anywhere. A
    /// primitive both sides agree on cannot fail that way.
    var clockFromEpoch: Double?

    /// The anchor as a `Date`, for `Text(timerInterval:)`.
    var clockFrom: Date? {
        clockFromEpoch.map { Date(timeIntervalSince1970: $0) }
    }

    /// The last thing worth interrupting someone for.
    ///
    /// ⚠ **This replaces SPEC §196's check-age footer.** That footer read
    /// `Checked 2h ago · no live feed yet` and the spec calls the age "the honest
    /// part of the design" — true against a 4-hourly sweep, and answering nobody's
    /// question against a 30-second feed (ADR 0055).
    var lastMoment: Moment?

    // ⚠⚠ **THERE IS NO STALL FIELD, and the reason is worth reading before
    // adding one.** A first draft carried `stalledLabel`, on the model of ADR
    // 0049's `lastSeenAt` signal on the Today board. It cannot work here: this
    // struct only ever changes when a push arrives, and a card goes stale by the
    // ABSENCE of pushes — so the one moment the flag would need to flip is the
    // one moment nothing is being sent. A server that could push "I have gone
    // quiet" has not gone quiet.
    //
    // The system already does this properly. `aps.stale-date` tells iOS when to
    // treat the card as out of date, and iOS greys it itself, on its own clock,
    // with no push required.
  }

  /// One alertable moment, mirroring `LiveAlert` in `live-alert.policy.ts`.
  struct Moment: Codable, Hashable {
    /// `goal` · `red-card` · `full-time`. ⚠ Yellow is NOT here — it moves the
    /// card's counts and never alerts.
    var kind: String

    /// ⚠⚠ Pre-formatted by the server in football notation: `90+4'`, never `94'`.
    /// The two minute conventions meet in `live-alert.policy.ts` and the card must
    /// not re-derive either — see that file's `minute` docblock.
    var minuteLabel: String

    /// ⚠ May be nil. The card drops the clause rather than drawing "unknown".
    var player: String?

    /// ⚠ On an own goal this is the SCORER's club, not the club that benefited.
    var teamSlug: String?

    /// `Getafe 10 men`, already in the reader's language. Only after a red.
    ///
    /// ⚠ Pre-composed by the server rather than assembled here — see the type's
    /// localisation note below.
    var consequenceLabel: String?
  }

  /// ⚠ **A uuid STRING.** `handoff_AG-ios/SPEC.md` §196 sketches an `Int`; that
  /// is wrong for this backend and is corrected here (ADR 0055).
  var fixtureId: String

  var homeSlug: String
  var awaySlug: String

  /// Three letters, for the fallback tile when a crest is missing. Resolved by
  /// the server, exactly as the push payload's are.
  var homeAbbr: String
  var awayAbbr: String

  var homeName: String
  var awayName: String

  /// ⚠ May be nil. The eyebrow drops the segment rather than printing an empty
  /// separator.
  var venue: String?

  /// ⚠ **The scheduled kick-off, for the pre-match state only.** The running
  /// clock does NOT count from here — see `ContentState.clockFromEpoch` for why.
  ///
  /// ⚠⚠ **UNIX EPOCH SECONDS, for the decoder reason spelled out on
  /// `clockFromEpoch`.** A `Date` here against an ISO string means the activity
  /// silently never starts.
  var kickoffEpoch: Double

  var kickoffUtc: Date { Date(timeIntervalSince1970: kickoffEpoch) }
}
