# 0083 — Every EAS build silently disables the Broadcast capability, so builds go through `yarn build:*` with `EXPO_NO_CAPABILITY_SYNC=1`

- **Date:** 2026-08-31
- **Status:** Accepted — mitigation shipped; capability re-enabled 2026-08-31 and a card rendered on a real device immediately after
- **Builds on:** [0055](./0055-live-activities-broadcast-channels.md),
  [0024](./0024-push-enabled.md)
- **Backend twin:** `senpai-backend/.claude/decisions/0039-apns-management-ports-are-not-symmetric.md`
  (the bug that had to be fixed before this one could even be seen)

## Context

0055 says the broadcast capability is *"a MANUAL Apple Developer portal step —
EAS capability sync does NOT cover it"*. That is true and far too gentle.

⚠⚠ **EAS does not merely fail to sync it. It actively turns it OFF, on every
build.** Broadcast is not a standalone capability: it is a sub-option nested
under `PUSH_NOTIFICATIONS` (`PUSH_NOTIFICATION_FEATURE_BROADCAST`). EAS's
capability syncer patches push with `{capabilityType: 'PUSH_NOTIFICATIONS',
option: 'ON'}` and no sub-options, which re-creates the capability at its
defaults and drops the Broadcast flag with it
([expo/eas-cli#3815](https://github.com/expo/eas-cli/issues/3815), open).

The timeline this produced:

1. **2026-08-28** — capability enabled by hand; `probe-apns.mjs --channel`
   returns `201`. Recorded as proven, correctly.
2. **Builds since**, including the preview build on the phone (its
   `device_tokens` row was written 2026-08-31 03:46Z). Each one silently
   stripped the flag.
3. **2026-08-31** — the first production channel create returns
   `400 BroadcastFeatureNotEnabled`.

⚠ Nothing reports this. There is no warning in the build log, no diff, and the
portal simply shows the checkbox unticked next time someone looks.

## Decision

**Builds run through `package.json` scripts that set `EXPO_NO_CAPABILITY_SYNC=1`.**

```
yarn build:development | build:preview | build:production
```

⚠⚠ **The variable CANNOT live in `eas.json`'s per-profile `env`.** Capability
sync runs locally during credential resolution, *before* build-profile
environment variables are loaded, so a value set there is read too late and has
no effect. It has to be in the shell environment of the `eas build` invocation —
which is precisely what these scripts guarantee and what a hand-typed
`eas build` does not.

Rejected: documenting "remember to re-tick the box after every build". It had
already failed once here, silently, between a verification that passed and a
production call that could not work.

## Consequences

- ⚠ **The capability must be re-enabled by hand ONE more time** — the scripts
  prevent future stripping, they do not restore what is already gone.
  Identifiers → `com.altagamafc.app` → Push Notifications → Configure →
  Broadcast.
- ⚠⚠ **Never run a bare `eas build` again.** It will silently disable Live
  Activities in production, and the only symptom is a
  `400 BroadcastFeatureNotEnabled` that nobody sees until a matchday.
- ⚠ Disabling capability sync means **EAS no longer reconciles the App ID with
  `app.json`'s entitlements**. Anything genuinely new — an added entitlement, a
  new target — now needs enabling in the portal by hand. That is a real cost,
  accepted because the alternative silently breaks a shipped feature. ⚠ The App
  Group and the time-sensitive entitlement are already provisioned, so nothing
  outstanding depends on the sync today.
- 0055's "EAS does not cover it" is superseded in spirit: it is not indifference,
  it is active removal. That entry is left unedited, per the repo's rule.
- ⚠ This trap is not specific to Live Activities. Any nested capability
  sub-option is exposed to the same reset.
