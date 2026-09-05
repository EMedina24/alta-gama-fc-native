# 0112 — Meta Ads is read over MCP, written by nobody yet, and the Page split is left open

- **Date:** 2026-09-04
- **Status:** Accepted
- **Decided by:** Ed Medina — the connector validation, the documentation, and the long-term
  goal ("create a dashboard and have you manage these ads via MCP") are his. ⚠ The **read-only
  containment in §2 is this entry's proposal**, standing until he says otherwise; it is not a
  restriction he asked for.
- **Relates to:** [0042](./0042-brand-spelling-spaced-form-reinstated.md) (the brand spelling the
  Page split cuts against), [0009](./0009-backend-is-only-data-gateway.md) (why the dashboard is
  not built here)
- **Detail:** [.claude/META-ADS.md](../META-ADS.md) — identifiers, call mechanics, every measured value
- **Mirror:** `senpai-backend/.claude/decisions/0052-meta-ads-mcp-is-the-ads-surface.md`

## Context

Ed asked whether the claude.ai **Meta MCP** connector worked, and whether the Alta Gama Instagram
account was visible under the **Social-Logistics** ad account. Both answers turned out to be
load-bearing:

1. ✅ The connector reads live. Ad accounts, Pages, campaigns, ads and creatives all came back.
2. ⚠⚠ `ads_get_ig_accounts` returns **`[]`** — while the ads it would describe are **serving**,
   with real `effective_instagram_media_id`s and ~22k impressions apiece. An empty array here
   means *"the connector cannot enumerate the asset"*, **not** *"the asset is not connected"*.
3. ⚠⚠ Alta Gama creatives are split across **two Facebook Pages** — `altagama.fc`
   (`1208965545641551`), which carries **all** current spend, and `Alta Gama FC`
   (`1234014533133945`), which carries the **newest** creative (2026-09-04). The split is active.

⚠ Point 2 is the kind of finding that gets written down wrong. The obvious reading — "Instagram
isn't linked, go link it" — is false, and acting on it would mean re-linking a working account.
The whole reason this entry exists is to stop the next reader re-deriving that and reaching the
same wrong conclusion.

## Decision

### 1. Meta Ads state is read through MCP, never through pasted screenshots

The same posture `senpai-backend/CLAUDE.md` §7 takes toward Render logs. Ads Manager is not a
source an agent quotes; the connector is queried. `.claude/META-ADS.md` holds the identifiers and
the call mechanics so nobody re-derives them.

### 2. ⛔ No writes. Not one, until Ed authorizes it explicitly

`ads_create_*`, `ads_update_entity`, `ads_activate_entity`, `ads_boost_ig_post` and every other
mutating tool are **present in the tool list and completely unexercised**. Write scope is
therefore **unverified**, exactly as `senpai-backend/.claude/render-mcp.md` records for Render.

⚠ The asymmetry is what forces the rule: a failed read costs nothing and says so, while a
successful write **spends money**, is visible to the public under a brand mark, and — for
`ads_activate_entity` — keeps spending after the session ends. There is no dry-run and no
sandbox on this account. "Try it and see" is not available as a verification strategy here.

This also inherits the posture of the backend's organic IG pipeline
(`senpai-backend/.claude/decisions/0049-ig-creative-pipeline.md`), which deliberately
ends at **a Hygraph draft a human approves** rather than at a publish. Paid promotion is
strictly the higher-stakes sibling; it does not get a weaker gate than the free one.

### 2.1 ⚠ Refinement, same day: creates land PAUSED — the risk is NOT uniform

*Added 2026-09-04 after reading the create-path schemas. **Refines** §2's reasoning; the
containment itself is unchanged.*

§2 argued a successful write "spends money" and "keeps spending after the session ends". ⚠ **That
is true of some writes and not others.** `ads_create_campaign` and `ads_create_ad_set` both create
in **`PAUSED`** state, and activation is a **separate tool** (`ads_activate_entity`, which
`ads_update_entity` explicitly refuses to do). Building and starting are two decisions.

⭐ So the dangerous verbs are **`ads_activate_entity` and edits to already-serving objects**, not
the create chain — a created campaign lands inert and is inspectable in Ads Manager first.

⚠ The containment still covers every verb: a paused object is still published into a real account
under a mark whose canonical Page is unsettled (§5), and the human-is-the-gate posture is the check
everywhere else in the ecosystem. But the ordering matters when it is lifted — **start with a
create, never with an edit to a live ad set.** The two currently spending campaigns are the two
cheapest per click in the account.

⚠ Also corrected: vertical video is **not** out of MCP's reach. `ads_creative_upload_media` accepts
a video by public URL, so the pass's top recommendation is buildable end to end; only producing the
video is outside. Full write-surface map:
`senpai-backend/.claude/meta-ads-mcp.md` § The write surface, mapped.

### 3. This repo documents the ads. It never contains them.

No ads code, no Meta SDK, no ad ids in app source. [0009](./0009-backend-is-only-data-gateway.md)
makes `senpai-backend` the only gateway, and this is not even reader-facing data. The doc lives
here because the **Page split is a brand problem** that 0042 owns and because this is where Ed
asked the question — not because the app has any part in it.

### 4. The dashboard, when it is built, is a backend ops-console screen

`senpai-backend` already has the console, the auth, and a precedent for exactly this shape: a
read-only-by-convention third-party API boundary serving an Observability screen
(`RenderApiService`, `.claude/decisions/0008`). An ads screen is that pattern a second time. It
is recorded there as `0052`, not here.

### 5. ⛔ Which Page is canonical is left OPEN — deliberately

See Open questions. This entry **does not** pick a Page, and no agent should. Consolidating
Pages is destructive and irreversible in the ways that matter (followers, post history, social
proof, ad-account asset assignment), and the two candidate marks are the exact pair 0042 was
fought over. It is Ed's call.

⚠ The operational consequence, until he makes it: **do not create a creative on either Page.**
Publishing on one silently casts the vote.

## Consequences

- ✅ Anyone can now answer "what is running and what is it costing" in two tool calls without
  Ed opening a browser.
- ⚠ **`ACTIVE` does not mean spending on this account.** Twelve campaigns hold
  `effective_status: ACTIVE`; two have delivery. Any future dashboard that counts `ACTIVE`
  campaigns will overstate reality by 6×.
- ⚠ **Social-Logistics is a shared account.** Six unrelated brands, history back to 2022. Every
  query and every future screen must filter to the Alta Gama Pages, or it reports on
  `hodl_it_crypto`.
- ⚠ The IG-enumeration gap **blocks `ads_boost_ig_post`**, which is precisely the tool the
  eventual "promote this post" flow would want. Whoever builds that flow hits this first, so it
  is worth clearing before design, not after.
- ⚠ This entry records a **hypothesis** for that gap (no owning business on the ad account, or
  an ungranted `instagram_basic`) and deliberately does not resolve it. Both produce an
  identical empty array; this session could not distinguish them, and a guess written down as a
  cause is worse than the open question.
- ⚠ The Page split keeps accruing while it stays open — spend on one Page, newest creative on
  the other. The cost of leaving it open is real, and is the reason it is flagged rather than
  merely noted.

## Alternatives considered

- **Authorize the separate `meta-ads` MCP server too** — it is configured, unauthorized, and
  redundant. The claude.ai Meta MCP connector already reads everything needed. A second
  credential path to the same account is more surface, not more capability.
- **Fix the IG gap by re-linking the Instagram account** — the tempting move, and wrong. The
  account is serving ads right now. Re-linking a working asset to resolve a *visibility*
  problem risks the thing that currently works.
- **Pick `Alta Gama FC` as canonical here, on 0042's authority** — 0042 governs **strings the
  product renders**, not which Facebook Page holds four years of audience. Extending it that far
  would be this repo legislating over an asset it does not own, and it would move all current
  spend to a Page with no history.
- **Put the ads screen in this app** — a reader-facing App Store client is not an operator
  console. Rejected on 0009 and on [SCOPE.md](../SCOPE.md).
- **Document only in `senpai-backend`** — the Page split is a brand fact, and brand rules live
  here now (0042, `ECOSYSTEM.md` § Naming). Splitting it across both, with each side pointing at
  the other, is what the ecosystem docs already do for every cross-repo fact.

## Verification

- ✅ `ads_get_ad_accounts` — two accounts; Social-Logistics `ACTIVE`/`is_queryable: true`,
  Odyssey `UNSETTLED`/`is_ads_mcp_enabled: false`.
- ✅ `ads_get_ad_account_pages` — 8 Pages, both Alta Gama marks present.
- ✅ `ads_get_ad_entities` at `campaign` level, `last_7d`, filtered `effective_status IN [ACTIVE]`
  — 12 campaigns, 2 with spend ($29.55 / $29.35) and impressions (22,728 / 22,204).
- ✅ `ads_get_ad_entities` at `ad` level filtered on those two campaign ids → creatives
  `2057167084940130`, `4498514770414448`.
- ✅ `ads_get_creatives` by id → both live creatives on Page `1208965545641551`; creative
  `2220701438773764` (2026-09-04) on Page `1234014533133945`. **This is the split, measured.**
- ⚠ `ads_get_ig_accounts` → `[]`, against live IG media ids on the same account. Reproduced
  behaviour; **cause not established.**
- ⛔ **No write tool was called.** Write scope remains unverified by design.
