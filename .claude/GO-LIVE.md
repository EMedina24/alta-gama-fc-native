# Go-live: what to do when the Apple Developer account lands

Everything gated on the licence is already written and wired. The app builds,
runs and behaves correctly today; the gated paths answer "not available" instead
of throwing. See [decisions/0023](./decisions/0023-phase-3-resequenced-no-apple-account.md)
for why it is split this way.

**The seam is one file:** [src/features/push/capability.ts](../src/features/push/capability.ts).
Nothing else in the app knows whether push exists.

---

## 1 · Apple, once

- [ ] Accept the Developer Program agreements in App Store Connect.
- [ ] Register the bundle id **`com.altagamafc.app`** (already in `app.json`).
- [ ] Enable **Push Notifications** on that App ID.
- [ ] Create an **APNs Auth Key (.p8)** — one key serves every environment. Hand
      the key, its Key ID and the Team ID to whoever configures `senpai-backend`;
      the four `APNS_*` vars there are currently unset.
- [ ] Create the App Group **`group.com.altagamafc.app`** (widgets only).

⚠ The server is **also** dark: `CRONOGOL_PUSH_CRON_ENABLED='false'` in
`render.yaml`. Both halves have to be turned on, and the backend wants an APNs
sandbox probe plus an operator dry-run (`POST /cronogol/admin/push` with
`{ "dryRun": true }`) before the cron is enabled.

## 2 · Install and configure

```bash
npx expo install expo-notifications
```

`app.json` → `plugins`:
```json
["expo-notifications", { "enableBackgroundRemoteNotifications": false }]
```
Leave that flag **false** — nothing in v1 needs a silent push.

Set the environment per EAS profile in `eas.json`:
```json
"development": { "env": { "EXPO_PUBLIC_APNS_ENV": "sandbox" } },
"preview":     { "env": { "EXPO_PUBLIC_APNS_ENV": "sandbox" } },
"production":  { "env": { "EXPO_PUBLIC_APNS_ENV": "production" } }
```

> ⚠ **Never wire `environment` to `__DEV__`.** It is `false` in a
> release-configuration dev-client build — exactly what an internal EAS build is —
> and a dev build registered as `production` receives nothing, silently, with no
> error anywhere. `apnsEnvironment()` already reads the profile var.

⚠ Installing `expo-notifications` **ends Expo Go**. From here every run is
`npx expo run:ios` or an EAS dev build.

## 3 · Flip the seam

In [capability.ts](../src/features/push/capability.ts):

- [ ] `PUSH_AVAILABLE = true`
- [ ] `requestPushPermission()` → `Notifications.requestPermissionsAsync()`
- [ ] `getDeviceToken()` → `(await Notifications.getDevicePushTokenAsync()).data`
      — ⚠ **`getDevicePushTokenAsync`, never `getExpoPushTokenAsync`.** The backend
      talks to APNs directly and validates 64 lowercase hex; an Expo push token is
      a different thing and is a 400.
- [ ] `applyReminders()` in [reminders.ts](../src/features/push/reminders.ts) →
      the commented `scheduleNotificationAsync` loop.

Each stub carries the exact replacement in a comment. Nothing else changes:
`buildRegistration`, the debounce, the diff-against-last-sent, the 20-slug cap and
the 64-notification rolling window are all already correct.

- [ ] Call `requestPushPermission()` from the onboarding primer's **Allow** button
      ([onboarding/alerts.tsx](../src/app/onboarding/alerts.tsx)) — ⚠ after the
      explanation, never on cold launch.
- [ ] Point the account sheet's destructive action at `disablePushForDevice()`.

## 4 · Widgets and Live Activity

- [ ] `npx create-target widget` (`@bacons/apple-targets`) — Swift lives in
      `targets/`, outside `ios/`, so CNG survives. Requires Xcode 16 / macOS 15.
- [ ] Add the App Group to `ios.entitlements` in `app.json`.
- [ ] `WIDGETS_AVAILABLE = true` and implement `reloadWidgets()`.
- [ ] ⚠ **Pre-download crests into the App Group.** A widget extension has a hard
      memory budget and unreliable network — never `AsyncImage` a remote crest in
      a timeline provider.
- [ ] Timeline policy: `.after(nextKickoff)` plus midnight. **Never per-minute.**

⚠ **Live Activity: decide the scope before anyone writes Swift.** SPEC §4 as
written is not implementable against this backend — `minuteLabel` has no source,
there is nowhere to put an ActivityKit push token (the push DTO 400s on undeclared
fields), and a local notification cannot start an activity while backgrounded.
The reduced version — crest pair, venue, a SwiftUI `Text(timerInterval:)` that
ticks with no data at all, and an honest footer — needs none of that.

## 5 · Verify

- [ ] `eas build --profile development --platform ios`
- [ ] Following a club produces a `PUT` whose 200 echoes the **exact** `clubSlugs`
      sent. ⚠ Persist what the server echoed, not what you sent — it collapses
      duplicates. (`sync.ts` already does.)
- [ ] A reminder scheduled ~20s out fires and its tap routes to the club.
- [ ] `xcrun simctl push booted com.altagamafc.app kickoff-moved.apns` with a
      payload copied from `.claude/PUSH-AND-ACCOUNTS.md` routes correctly. **This
      is the only way to exercise the two server payload types while the cron is
      dark** — do it before asking anyone to enable the cron.
- [ ] `xcrun simctl openurl booted "altagamafc://club/valencia"` lands on the club
      page. (Untestable in Expo Go — a custom scheme needs a real build.)
- [ ] Both widget sizes render real followed-club data; the timeline reloads on a
      follow change and **not** per minute.

## Store submission

- [ ] Privacy nutrition labels must match what is actually collected: an APNs
      token and a list of followed club slugs, device-keyed, **no account**.
- [ ] ⚠ Guideline **5.1.1(v)** (account deletion) does not apply while there is no
      account *creation* — see [decisions/0019](./decisions/0019-anonymous-v1.md).
      It starts applying the day sign-in ships.
- [ ] ⚠ Guideline **4.8**: if Google sign-in is ever added, Apple generally
      requires an equivalent private option (Sign in with Apple), which the
      backend does not support. That is a backend project, not an app one.
- [ ] Guideline **4.2** ("minimum functionality") is the real risk for an app that
      ports a website. Widgets, native tabs and local match reminders are the
      argument — which is why the widgets are worth doing.
