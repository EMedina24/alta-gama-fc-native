# 0026 — The APNs environment follows the provisioning profile, not the build name

- **Date:** 2026-08-25
- **Status:** Accepted
- **Revises:** the `eas.json` half of [0024](./0024-push-enabled.md)
- **Decided by:** Ed Medina

## Context
`eas.json` was written assuming *development build ⇒ APNs sandbox*. That is
wrong, and it cost a debugging round on 2026-08-25.

The `aps-environment` entitlement is set by the **provisioning profile type**:

| Profile | `aps-environment` | Host |
| --- | --- | --- |
| Development | `development` | `api.sandbox.push.apple.com` |
| **Ad Hoc** | **`production`** | `api.push.apple.com` |
| App Store | `production` | `api.push.apple.com` |

**EAS `distribution: "internal"` is ad-hoc provisioning.** So an EAS profile named
`development` produces a **production** APNs token.

### The evidence
`senpai-backend`'s `scripts/probe-apns.mjs`, run against a real token from the
`development` build:

- garbage token, sandbox → `400 BadDeviceToken` → **auth is correct**, the `.p8`,
  Key ID and Team ID are all right
- real token, sandbox → `400 BadDeviceToken` → **the token is not a sandbox token**
- real token, production → `403 BadEnvironmentKeyInToken` → **the KEY was scoped
  Sandbox-only** in the Apple portal

Two independent settings, neither broken, that did not match.

## Decision
1. `eas.json` sets `EXPO_PUBLIC_APNS_ENV=production` on every **non-simulator**
   profile — `development`, `preview` and `production`. Only the `simulator`
   profile stays `sandbox`, and it can never obtain a token anyway.
2. The APNs Auth Key is reconfigured in the Apple portal to **Sandbox &
   Production** rather than Sandbox-only. ⚠ **Edited, not recreated** — the
   account is capped at 2 keys and recreating also means redoing the Render
   base64.

## Consequences
- ⚠ **This failure mode is SILENT.** The device registers successfully, the row
  is stored, the app shows no error — and every dispatch fails at APNs. Nothing in
  the app can detect it; only the backend's probe or a missing notification
  reveals it. That is why the reasoning is written down rather than left in a var.
- A key scoped to **both** environments is the durable answer: TestFlight, App
  Store and ad-hoc are all production, while a true Development-provisioned build
  (`npx expo run:ios` against a development profile) is sandbox. One key covers
  every case.
- ⚠ If anyone ever builds with a genuine **Development** provisioning profile,
  that build's token IS sandbox and `EXPO_PUBLIC_APNS_ENV` must be `sandbox` for
  it. There is no reliable JS API to read `aps-environment` at runtime, so this
  stays a build-configuration decision, not a detected one.
- `/_debug/push` surfaces the claimed environment next to the token, so the
  mismatch is at least visible to whoever is looking.

## Alternatives considered
- **Force a Development provisioning profile** so tokens are sandbox — possible,
  but it fights EAS internal distribution and would have to be undone for
  TestFlight anyway.
- **Detect `aps-environment` at runtime** by reading the embedded provisioning
  profile — needs a native module for a value that changes only when the build
  configuration changes.
