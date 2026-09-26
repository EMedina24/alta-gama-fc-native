# 0208 — The account sheet becomes the Settings screen

- **Date:** 2026-09-25
- **Status:** Accepted
  - `tsc` is clean. Lint is unchanged (the 5 errors and 1 warning were already
    there, none in these files). `preferences-harness` is green with 18 fields.
  - **Simulator-verified in `es` against production:**
    - `/settings` signed out, over a Real Madrid pick.
    - `/_debug/settings?state=in` over the Barcelona, LaLiga and default
      scenes, top to bottom via `?y=`.
    - The three new sheets presented over Settings.
    - The Board's edit panel on the shared strip.
  - **Not verified:**
    - Saving a name against the live `PATCH /cronogol/me`, and Sign out /
      Delete against a real account. The simulator has no account; the
      signed-in half has only been seen on the stub.
    - `en`.
    - Anything that needs a tap: switches, tiles, pickers.
- **Decided by:** Ed: *"make a plan to update the account page using
  /medina-digital-design and make it look like the design"*, with a two-screen
  Settings mock. Offered four choices, he chose:
  - a **pushed screen**;
  - build the **app-only quick wins and Favourite club**;
  - **keep everything** the sheet had;
  - the scene is **the chosen background**.
- **Supersedes in part:** [0081](./0081-account-sheet-redesign.md) (the sheet's
  identity row, glyph tiles and staggered entrance) and
  [0093](./0093-sheets-on-their-own-ground.md)'s account-sheet specifics. Every
  behavioural rule those two carried is kept.

## Context

The account sheet (`(sheets)/account`, a full-detent formSheet) predated the
Medina kit. Ed's mock is a pushed screen:

- a club scene with a crest watermark;
- a centred Saira profile header;
- glass groups: FAVOURITE CLUB, FOLLOWING, NOTIFICATIONS, APPEARANCE (with the
  background tiles), ABOUT;
- a red Sign out card.

About half the mock had nothing behind it.

## Decision

- **A pushed route, `/settings`**, replaces the sheet. The five avatar and
  feed-tile entry points push it, and `AvatarButton`'s label is localised.
  - A sheet could not carry the scene: on iOS 26 a formSheet is system glass.
  - The sign-in sheets still present over it, and `dismiss(2)` lands here.
  - Sign out, Delete and Turn off alerts **stay on the screen**: the re-render
    is the confirmation.
- **The scene is the reader's `bdBg`**:
  - a club pick wears the club page's scene (0202);
  - a league pick wears the league tabs' scene (0201);
  - the brand default wears the lime glow.

  Picking a tile repaints the page behind the strip. A club the catalogue
  can't answer yet falls back to the glow and never rewrites the pick.
- **Built, app-only:**
  - Edit profile: `(sheets)/edit-profile`. It sends `notifyFixtureChanges`
    back as read, since the field is required on every PATCH, and writes the
    answer into the account query.
  - A time-zone picker: `(sheets)/time-zone`, the first caller
    `setTimezoneId` ever had. Device option first, then the six presets.
    Device-only.
  - Privacy: `privacyUrl`.
  - Version: `expo-application` ([0210](./0210-expo-application-for-the-version.md)).
  - Favourite club: [0209](./0209-a-favourite-club.md).
- **Left off the screen, not faked:**
  - "Member since" and followed LEAGUES. Both need `senpai-backend`: `/me`
    doesn't return `created_at`, and follows are clubs only.
  - Separate Full-time and Live Activities switches. One `alertGoals` covers
    goals, reds and full time (0053).
  - Hide scores, a cross-app spoiler feature.
- **Kept, restyled:**
  - kickoff-moved and postponed alerts;
  - the reminder's lead-time CHIPS (a reader can hold several; the mock's
    single "30 min" would misstate that);
  - the 24 h / 12 h clock;
  - calendar feeds;
  - replay onboarding;
  - turn off alerts;
  - contact, as "Help & feedback";
  - Delete account (Guideline 5.1.1(v)), two-step as before.

  The alert footnote stays directly under the switches (0079), still
  pressable when it's the no-permission instruction (0136). The goals note's
  copy is unchanged; HANDOFF reserves it for Ed.
- **FOLLOWING lists clubs**, as crest chips with a dashed "+ Add" chip that
  opens the Clubs tab. A club with no page (`useCanOpenClub`) is a chip, not a
  link.
- **Lime budget:**
  - The switches, and signed out, the Sign in button.
  - The segmented controls are a new NEUTRAL tone: a dark thumb, the mock's.
  - Edit profile is a new `Button` `glass` tone, which presses with a tint
    and never opacity.
  - The feed rows' COPY turns lime only once copied.
- **No entrance animation.** The sheet's `Rise` stagger faded the parents of
  what are now glass groups (0120/0122, trap 80).
- **Footer: "Alta Gama FC · Medina Digital".** The mock's "AltaGama FC" is the
  closed-up spelling [0042](./0042-brand-spelling-spaced-form-reinstated.md)
  reversed.
- **New pieces:**
  - Molecules: `ScreenBar`, `ListGroup`, `SettingsRow`, `FollowChips`,
    `SceneTileStrip`, and `Segmented`, promoted from the sheet's folder.
  - Template: `board-background.tsx`, holding `backgroundTiles` and
    `BackgroundScene`, which need `ART_MARK`.
  - `clubStanding` in `lib/cronogol/standings.ts`, lifted from the club page
    so the favourite row and the hero quote a table by the same rule
    (trap 20).
  - `stripOptions` in `features/board/background-options.ts`.
  - Today's edit panel draws the same strip from the same builders.

## Consequences

- One place draws the background strip and one decides its order, so the
  Board and Settings can't drift.
- The formSheet sticky-bar write-up that lived in `account-sheet.tsx` now
  lives in `board-background-sheet.tsx`'s header. `email-auth-sheet` and
  `sign-in-sheet` point there.
- `/_debug/settings?state=in|out&bg=…&y=…` previews every state from a deep
  link. `/_debug/sheets?which=account-in` redirects to it.
- The unbuilt mock items are backlog, and each needs its own decision:
  "Member since", league follows, the Full-time / Live Activities split, Hide
  scores.

## Alternatives considered

- **Restyle the sheet in place.** Rejected by Ed: there's no scene on a glass
  sheet and no back chevron.
- **Draw every mock row, disabled where unbacked.** `ActionRow`'s rule (0141),
  that "an explained row reads as missing data", is for data that varies. A
  switch for a feature that doesn't exist yet isn't missing data: it would sit
  disabled for good and read as broken.
- **League chips under FOLLOWING, as drawn.** They would promise alerts
  nothing sends.
