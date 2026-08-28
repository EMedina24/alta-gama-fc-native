# Ecosystem — the repos around this one

This app is the **third** surface in an existing product. It is not standalone:
the data, the brand, and the API contract already exist and are owned elsewhere.

```
                    ┌──────────────────────────┐
                    │      senpai-backend       │  NestJS · crono-gol.com
                    │  the ONLY data gateway    │  Supabase, football APIs,
                    └───────┬──────────┬────────┘  Hygraph, Resend, .ics feeds
                            │          │
              ┌─────────────┘          └──────────────┐
              ▼                                       ▼
    ┌──────────────────┐                    ┌────────────────────┐
    │     cronogol     │                    │ alta-gama-fc-native│
    │  Next.js · web   │                    │   Expo · this repo │
    │ altagamafc.com   │                    │    iOS / Android   │
    │  ★ lead surface  │                    │      ☆ new         │
    └──────────────────┘                    └────────────────────┘
```

## The repos

| Repo | Path | Role |
| --- | --- | --- |
| **senpai-backend** | `/Users/ed/Desktop/repos/senpai-backend` | NestJS API. Feeds **all** data. [github](https://github.com/EMedina24/senpai-backend) |
| **cronogol** | `/Users/ed/Desktop/repos/cronogol` | Next.js web app behind `altagamafc.com`. The **main driving force** of the product — treat its behavior as the reference implementation. [github](https://github.com/EMedina24/cronogol) |
| **alta-gama-fc-native** | this repo | Expo native app. Newest, least defined surface. |

Both are reachable via `permissions.additionalDirectories` in
[.claude/settings.json](./settings.json) — read them directly, don't ask for pastes.

⚠ **Identify a repo by its directory path, not its package name.** `cronogol`'s
`package.json` is *also* named `"alta-gama-fc"`. (A fourth duplicate scaffold at
`repos/alta-gama-fc` was deleted 2026-08-24 — see
[decisions/0011](./decisions/0011-alta-gama-fc-repo-removed.md).)

## ⚠ Naming — get this right

Three marks are in play and they do **not** collapse into each other:

| Form | Where it belongs |
| --- | --- |
| **Alta Gama FC** | Reader-facing brand. **Spaced.** Reinstated 2026-08-26 — see [0042](./decisions/0042-brand-spelling-spaced-form-reinstated.md). |
| ~~AltaGama FC~~ | The closed-up spelling this reverses. In force 2026-08-11 → 2026-08-26. |
| **CronoGol** | Internal name — kept deliberately in route prefixes (`/cronogol/*`), env vars, `crono-gol.com`, class names, operator surfaces. |
| **Alta Gama Fixture Club** | A **separate** mark that does not collapse — page-title suffix and logo lockup. Unaffected by 0042. |

⚠ **This repo now leads on the spelling and the other two have not caught up.**
`senpai-backend/CLAUDE.md` was the authority and still states the closed-up rule,
which `CRONOGOL.md` §44 enforces in every outgoing email; `cronogol` follows it
too. So a reader gets `Alta Gama FC` on the app's launch screen and
`AltaGama FC` in their kickoff email until those repos are updated. Do not "fix"
this repo back to match them — 0042 is the newer decision. Copy brand strings from
the table above, not from `senpai-backend`, until it is re-synced.

## ⚠ Domains — two hosts, on purpose

| Host | What it is |
| --- | --- |
| `altagamafc.com` | The web front end. **Only** the front end. |
| `crono-gol.com` | The **backend API**. Every API call and every `.ics` subscriber's calendar resolves here. |

`GET /` on `crono-gol.com` answers a JSON 404 because it is an API root. That is
correct and must not be "fixed" — the feed host is a one-way door, already copied
onto subscribers' devices, unable to tell them it moved.

Local dev: backend runs on **`http://localhost:3001`** (Next keeps 3000).
`https://senpai-backend-3j75.onrender.com` also answers but is not the URL to code against.

## The API contract

**Source of truth:** `senpai-backend/CRONOGOL-API.md` (~3,800 lines).

> ⚠ That file **exists twice** — also at `cronogol/CRONOGOL-API.md`, the copy the
> web app is built against. They are the same contract and **have already drifted
> once**. If this native app forces a contract change, both copies change in the
> same sitting (until `DEV-49` collapses them).

**The backend is the only gateway.** The client never talks to Supabase or the
football API directly — no database keys ship to the client, and response shapes
stay stable across a provider switch. That rule applies to this app too.

### Endpoint surface (as of 2026-08-24)

Public read: `/cronogol/teams`, `/cronogol/teams/{slug}/fixtures`,
`/cronogol/teams/{slug}/squad`, `/cronogol/teams/{slug}/news`, `/cronogol/leagues`,
`/cronogol/fixtures`, `/cronogol/standings`, `/cronogol/jornada/{league}/{season}[/{n}]`,
`/cronogol/news`, `/cronogol/news/leagues`, `/cronogol/scores`, `/cronogol/scores/recent`,
`/cronogol/live` (**added 2026-08-27** — in-play state with a MINUTE, LaLiga only;
see [.claude/LIVE-SCORES.md](./LIVE-SCORES.md)), `/cronogol/health`, `/og/match.png`

Calendar feeds: `/cronogol/feed/{slug}.ics`, `/cronogol/feed/jornada/{league}/{season}/{n}.ics`

Account: `GET|PATCH /cronogol/me`, `POST /cronogol/me/email`,
`GET|POST /cronogol/me/feeds`, `DELETE /cronogol/me/feeds/{token}`,
`DELETE /cronogol/me` (account deletion — **added 2026-08-24 for this app**)

Push (native-only, **added 2026-08-24 for this app**): `PUT|DELETE /cronogol/push/device`
— device registration + per-club follow state. Full hookup guide, payload
contract and the raw-APNs-token / sandbox-environment traps:
[.claude/PUSH-AND-ACCOUNTS.md](./PUSH-AND-ACCOUNTS.md). ⚠ The server sends
nothing yet — dark behind a flag until the Apple Developer account exists.

Admin/ops (not for this app): `/cronogol/admin/*`, `/cronogol/dashboard/*`

### ⚠ Data traps that will produce convincing-looking bugs

Read `CRONOGOL-API.md` §"Read this before building any UI" in full before
building a screen. The ones that bite hardest:

- **`lastSyncedAt === null` means "this is not a schedule."** Opponent-only clubs
  return a handful of matches, not a season. Render an empty/pending state, never
  the partial list.
- **Season is 2026/27, live.** Kicked off 2026-08-15. `scheduled` and `finished`
  are both normal; `goalsFor`/`goalsAgainst` are real on played matches, `null`
  otherwise. Results are not an empty state to design around.
- **Jornada order is NOT chronological**, and a jornada can be *published but
  unscheduled* rather than missing.
- **Scores are from the requested team's perspective** on club routes
  (`goalsFor`/`goalsAgainst`), home/away on jornada routes (`goalsHome`/`goalsAway`).
- **`/cronogol/scores` is a different feature on a different source** — refreshed
  every ~4h, no live push, and it does **not** join to clubs, fixtures or jornadas.
  Do not reconcile it against `/cronogol/standings`.
- ⚠⚠ **`/cronogol/live` is a THIRD source and must not be merged with either.**
  Added 2026-08-27. It is the only route with a **minute**, the only live data
  that **joins to a fixture** (`fixtureId` + team slugs), and it is **LaLiga
  only**. It refreshes every ~30s *during a match* and rows **disappear** when
  the match ends — it is not a results feed. ⭐ A per-match `events` timeline is
  WRITTEN on the backend (§98, 2026-08-28) but **not yet deployed** — same
  shapes as `/cronogol/fixtures/{id}/events` minus its stored-row `id`. It does **not** license
  un-suppressing liveness on `/cronogol/scores`, which is still a 4-hourly
  snapshot: see [.claude/LIVE-SCORES.md](./LIVE-SCORES.md) §1 before touching
  `src/lib/cronogol/scores.ts`.
- **Standings lag a finished match by up to ~3h** and carry no zones, no home/away
  split, no live update.
- **`to` is EXCLUSIVE on `/cronogol/fixtures`** (`[from, to)`) but **inclusive** on
  `/cronogol/teams/{slug}/fixtures`. On purpose. Send your own `from`/`to`.
- **`/cronogol/fixtures` 400s on an unknown query param.**
- **Do not hardcode league slugs** — `/cronogol/teams` returns every tracked club.
  Coverage grows (LaLiga, Segunda, Premier League, Serie A, Bundesliga; ~100 clubs).
- **Crests: use `logoUrl`.** Do not hot-link the provider.

## Where to look things up

| Question | File |
| --- | --- |
| API request/response shapes | `senpai-backend/CRONOGOL-API.md` |
| Backend conventions, brand rules | `senpai-backend/CLAUDE.md` |
| Product history & decisions (12.7k lines) | `senpai-backend/CRONOGOL.md` |
| Account/auth behavior | `senpai-backend/CRONOGOL-ACCOUNT-PAGE.md` |
| Push registration, payloads, account deletion (this app) | [.claude/PUSH-AND-ACCOUNTS.md](./PUSH-AND-ACCOUNTS.md) |
| Live scores — the route, the caveats, why the scoreboard stays suppressed | [.claude/LIVE-SCORES.md](./LIVE-SCORES.md) |
| Deploy/infra | `senpai-backend/DEPLOY.md` |
| Web app ground rules | `cronogol/AGENTS.md` |
| Web feature/gotcha notes | `cronogol/docs/{features,gotchas,plans}/` |

## ⚠ Inherited working rules

From `cronogol/AGENTS.md` — assume they apply here unless decided otherwise:

- **Never commit, never push.** Leave finished work in the working tree for
  hand review. Netlify auto-builds `main`, so on the web repo a push *is* a
  production release.
- **Never put configuration detail in the UI.** No env var names, config keys,
  host names or deployment state anywhere a visitor can see — no missing-config
  notices, no diagnostic banners.
