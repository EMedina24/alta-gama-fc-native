# `.claude/` — Project Knowledge Base

Documentation Claude Code (and humans) should read before working in this repo.

| File | What it holds |
| --- | --- |
| [HANDOFF.md](./HANDOFF.md) | **Start here** — state of play, open work, and the traps that have already bitten |
| [SCOPE.md](./SCOPE.md) | **What we're building and why** — purpose, platform targets, what's out of scope |
| [PROJECT.md](./PROJECT.md) | The stack, the layout, how to run it |
| [ECOSYSTEM.md](./ECOSYSTEM.md) | **The other repos** — backend, web app, API contract, brand and domain rules |
| [CONVENTIONS.md](./CONVENTIONS.md) | Code conventions in force (naming, imports, theming, platform splits) |
| [GO-LIVE.md](./GO-LIVE.md) | **What to do when the Apple Developer account lands** — the licence-gated checklist |
| [PUSH-AND-ACCOUNTS.md](./PUSH-AND-ACCOUNTS.md) | Backend push + account-deletion hookup guide |
| [settings.json](./settings.json) | Grants read access to the sibling repos |
| [decisions/](./decisions/) | Decision log — one file per decision, newest number highest |

## Rule: every decision gets written down

Whenever a decision is made in this project — a library choice, an architectural
split, a convention, a thing deliberately *not* done — add a numbered file to
[decisions/](./decisions/) before or alongside the code that implements it.
See [decisions/README.md](./decisions/README.md) for the format.

"Decision" means anything a future reader could reasonably ask "why is it like
this?" about. Routine implementation that follows an already-recorded decision
does not need a new entry.
