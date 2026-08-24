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
| **AltaGama FC** | Reader-facing brand. **One word, no space.** |
| ~~Alta Gama FC~~ | **RETIRED** spelling (as of 2026-08-11). Never write it. |
| **CronoGol** | Internal name — kept deliberately in route prefixes (`/cronogol/*`), env vars, `crono-gol.com`, class names, operator surfaces. |
| **Alta Gama Fixture Club** | A **separate** mark that does not collapse — page-title suffix and logo lockup. |

`senpai-backend/CLAUDE.md` is the authority; copy brand strings from there.

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
`/cronogol/health`, `/og/match.png`

Calendar feeds: `/cronogol/feed/{slug}.ics`, `/cronogol/feed/jornada/{league}/{season}/{n}.ics`

Account: `GET|PATCH /cronogol/me`, `POST /cronogol/me/email`,
`GET|POST /cronogol/me/feeds`, `DELETE /cronogol/me/feeds/{token}`

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
