# 0209 — A favourite club

- **Date:** 2026-09-25
- **Status:** Accepted
  - `preferences-harness` asserts the membership rule (`parseFavourite`) and
    that the new field compares unequal when it alone moves.
  - Picker and row seen on the simulator ([0208](./0208-the-account-sheet-becomes-settings.md)).
    Choosing one by tap is not exercised.
- **Decided by:** Ed chose to build it when planning Settings. His mock has a
  FAVOURITE CLUB row and a crest badge on the avatar.

## Context

The app had followed clubs, an unordered list, and no notion of *the*
reader's club. The mock names one: a row with its league and position, and
its crest on the avatar.

## Decision

- **`favourite: string | null`** in the preferences, a club slug. It's a
  scalar for `same()`'s sake, and it bumps the schema to **v9**. Absent on
  older payloads means none.
- **It is always a member of `followed`, or null.**
  - `parse` drops a stored favourite that isn't followed.
  - `unfollowClub` clears it in the same write, and so does `clearFollows`.
  - `setFavouriteClub` refuses a slug that isn't followed rather than
    following it for the reader: choosing a favourite isn't consent to
    alerts.
  - (`followClubs` only ever adds, so it can't orphan one.)
- **Chosen from `(sheets)/favourite-club`**: the followed clubs with their
  league (`leagueOfClub`), plus "None". With nothing followed, the sheet
  points to the Clubs tab.
- **Shown** as Settings' FAVOURITE CLUB row and as the avatar's crest badge.
  The row quotes the table through `clubStanding` (trap 20), the same rule the
  club hero uses. It falls back to the league's name, then to nothing.
- **Device-only.** It isn't sent to the backend, and nothing server-side
  treats it differently from any other followed club.

## Consequences

- Other surfaces can now ask "whose club is this reader?". None does yet:
  Settings' scene, for one, still comes from the background pick (`bdBg`).
- A second device doesn't know the favourite. That's the same as the follow
  list itself, which the app has never synced to the account (it never calls
  `/me/follows`).

## Alternatives considered

- **The first followed club as the implicit favourite.** It's an index-zero
  default, which trap 66 warns against: the list is ordered by when a club
  was followed, not by which one matters.
- **`bdBg`'s club as the favourite.** That's a wallpaper choice, and a reader
  can pick a league or a rival's colours as a background.
