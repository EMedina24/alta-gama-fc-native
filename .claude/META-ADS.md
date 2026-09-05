# Meta Ads — the paid surface, and what an agent can actually see

*Verified 2026-09-04.* Alta Gama FC's paid promotion runs on Meta, and an agent working in
this repo can **read it directly** through the claude.ai **Meta MCP** connector. Do not ask Ed
to paste Ads Manager screenshots — query it.

This file is the connection's ground truth. The stance behind it is
[decisions/0112](./decisions/0112-meta-ads-read-over-mcp.md).

> ⚠ **This is not app code and never becomes app code.** The iOS app does not read, write, or
> know about any of this. It is here because the ads promote *this product* and because the
> Page split below is a live **brand** problem that [0042](./decisions/0042-brand-spelling-spaced-form-reinstated.md)
> owns. The backend holds the mirror of this file at `senpai-backend/.claude/meta-ads-mcp.md`,
> and the dashboard, if it is ever built, belongs **there** — see §6.

## 1. Identifiers

| Thing | Value |
| --- | --- |
| Ad account | `267894487225077` — **Social-Logistics**. `ACTIVE`, USD, payment method present, `is_ads_mcp_enabled: true`, `is_queryable: true` |
| Min daily budget | 100 cents (USD) |
| Owning business | **none** — `business_id` is the empty string. ⚠ See §5; this is probably why the IG account will not enumerate |
| Page (spend is here) | `1208965545641551` — **`altagama.fc`** |
| Page (newest creative) | `1234014533133945` — **`Alta Gama FC`** |

⚠ **`Social-Logistics` is not an Alta Gama account.** It is Ed's general advertising account and
carries six unrelated brands' history — `Shop Odyssey`, `hodl_it_crypto`, `dev_setups`,
`real_clean_memes_`, `Medina's Photography`, plus the two Alta Gama Pages. An unfiltered campaign
list reaches back to **2022** and is mostly not this product. Filter, always.

The second visible account, **Odyssey** `228604413220885` (business `890214535753303`), is
`UNSETTLED` with `is_ads_mcp_enabled: false` (*"Ads MCP is gradually being rolled out"*) and
`is_queryable: false`. ⛔ **Do not route calls through it** — nothing about Alta Gama lives there.

## 2. ⚠⚠ The Page split — the finding that matters

Alta Gama creatives are being published under **two different Facebook Pages**, and this is not
a naming cosmetic — it is two separate audience graphs, two sets of social proof, and two
different asset-permission surfaces.

| Creative | Dated | Page | Which mark |
| --- | --- | --- | --- |
| `4498514770414448` (live) | 2026-08-31 | `1208965545641551` | `altagama.fc` |
| `2057167084940130` (live) | 2026-08-31 | `1208965545641551` | `altagama.fc` |
| `1588157496016346` | 2026-08-31 | `1208965545641551` | `altagama.fc` |
| `2220701438773764` | **2026-09-04** | `1234014533133945` | **`Alta Gama FC`** |

**Both campaigns that are currently spending run on `altagama.fc`. The newest creative does
not.** So the split is active, not historical.

⚠ Note which way this cuts against [0042](./decisions/0042-brand-spelling-spaced-form-reinstated.md):
the reader-facing mark is the **spaced** `Alta Gama FC`, but every dollar spent to date has gone
out under the **closed-up** `altagama.fc` Page. The Page carrying the spend and the brand this
repo leads on are not the same string.

⛔ **Which Page is canonical is NOT decided.** Ed has not called it. Nothing in this file, and no
agent, should pick one — see 0112 § Open questions. Until it is called, **do not create a
creative on either Page**, because doing so silently casts the vote.

## 3. What is actually running

Twelve campaigns carry `effective_status: ACTIVE`. **Two have delivery.** The other ten are
finished boosts that never left the active state — ⚠ `ACTIVE` on this account means "not
archived", not "spending". Always confirm with spend or impressions over a window.

| Campaign | ID | Spend (7d) | Impressions | Objective |
| --- | --- | --- | --- | --- |
| *Siete goles en el Spotify Camp…* | `120246415609110582` | $29.55 | 22,728 | `LINK_CLICKS` |
| *Ahí abajo, cinco equipos…* | `120246415616020582` | $29.35 | 22,204 | `LINK_CLICKS` |

Both are **boosted Instagram posts**, in Spanish, LaLiga match commentary — the same editorial
voice the app ships. Each is one campaign → one ad → one creative → one IG media id.

### ⚠⚠ Two application names write targeting here, and both are Ed

The account's activity log shows targeting edits from two `application_name` values. **Neither is a
rogue script** — `actor_id` is `61593201241823` ("Alta Gama FC") on both. They are two client
surfaces for the same person:

| `application_name` | What it is |
| --- | --- |
| `Boosted Instagram Media Mobile` | The IG app's boost flow — creates the ad set (`old_value: []`) |
| `AdInternalScript` | The IG app **propagating an audience edit across other boosts**, 2–3 min later |

Ed identified this on 2026-09-04, and the timestamps confirm it. On 9/1, ad set
`120246415616420582` was created at `00:25` already carrying `ES + PR`; at `00:27` `AdInternalScript`
touched it with `old_value` **identical** to `new_value` — a no-op — while in the same batch the
older `120246321339250582` and `120246046833450582` went `ES` → `ES + PR`. The 8/25 `14:39` batch is
the same shape: "Bad Bunny" dropped and Advantage+ Audience flipped On → Off across four ad sets
three minutes after a boost at `14:36`.

⚠⚠ **This is a clobber risk for any MCP write.** An audience edit made in the IG app **fans out to
other ad sets sharing that audience definition** — including ones edited elsewhere. A targeting
change made through this connector can therefore be silently overwritten by a later boost edit in
the app, with no error and no notification. ⚠ Pick one surface per ad set; do not alternate.

⚠ A same-second batch of edits where some rows are no-ops is the **signature** of this propagation.
Do not read a no-op row as a malfunction — it means that ad set already matched the new definition.

## 4. What was exercised, and what was not

**✅ Verified working (read):** `ads_get_ad_accounts`, `ads_get_ad_account_pages`,
`ads_get_ig_accounts` (returns empty — §5), `ads_get_ad_entities` at `campaign` and `ad` level,
`ads_get_creatives` (both listing and by-id).

**⛔ Never exercised — write scope is UNVERIFIED.** No campaign, ad set, ad, creative, audience,
or budget has been created, updated, paused, or deleted through this connector. `ads_create_*`,
`ads_update_entity`, `ads_activate_entity` and `ads_boost_ig_post` are **present in the tool list
and unproven**. Do not assume a write will succeed, and do not discover that it does by spending
Ed's money — see 0112 §2.

### Call mechanics that cost time to work out

- ⚠ **`client_conversation_id` is required on every single call** — exactly 20 chars of
  `[A-Za-z0-9]`. Generate one per conversation and reuse it verbatim, including across topic
  changes. It is not an account id and must never carry one.
- ⚠ **`ads_get_creatives` listing returns only `id`, `name`, `account_id`, `status`.** Every
  other field is omitted. A missing `effective_instagram_media_id` in a listing means *"not
  requested"*, **never** *"not set"*. Re-call with `creative_ids` + `fields`.
- ⚠ **`amount_spent` comes back as a formatted string** (`"$29.55 USD"`), not a number. Parse
  before arithmetic.
- Filtering that works: `{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]}`
  and `{"field":"campaign.id","operator":"IN","value":[…]}` at `level: "ad"`.
  Sorting: `"impressions_descending"` (a string, not an object).
- At `level: "ad"`, requesting the field `creative` returns `creative_id` — that is the only
  bridge from an ad to its Page and IG media.
- Campaign metrics default to the **last 28 days** when neither `date_preset` nor `time_range`
  is given. Say which you mean.

## 4b. The write surface — read, not exercised

Schemas read 2026-09-04. ⛔ **No write tool has been called.** Full map:
`senpai-backend/.claude/meta-ads-mcp.md` § The write surface, mapped.

⭐ **Creates land `PAUSED`.** `ads_create_campaign` and `ads_create_ad_set` both create paused, and
activation is a **separate** tool (`ads_activate_entity`). Building a campaign and starting one are
two decisions — which is why [0112](./decisions/0112-meta-ads-read-over-mcp.md) §2.1 refines §2's
claim that a write necessarily spends money. ⚠ The dangerous verbs are **activate** and **edit a
live ad set**, not the create chain.

⚠ **Vertical video IS reachable** — `ads_creative_upload_media` takes a video by public URL, so the
optimization pass's top recommendation can be built end to end. Only *producing* the video is out
of scope.

⚠⚠ **New interests cannot be discovered** — there is no targeting-search tool here, and inventing
ids is forbidden. The nine live interest ids are readable off the ad sets and reusable; anything
new has to come from Ed or Ads Manager.

⚠ Four account-specific create traps: objective must be **ODAX** (`OUTCOME_TRAFFIC`, not the
legacy `LINK_CLICKS` our boosts report); **Advantage+ Audience defaults ON** and softens age bounds
unless set to `0`; **DSA fields are required for Spain** and auto-fill from a business name this
account **does not have**; min daily budget is **$1**.

## 5. ⚠⚠ The Instagram account does not enumerate — and that is a permission gap, not a break

`ads_get_ig_accounts(267894487225077)` returns **`[]`**.

It would be easy to read that as "the IG account isn't connected". **It is connected and it is
serving.** Every live creative carries a real `effective_instagram_media_id`
(`17935109388364759`, `18057594068621759`) and the ads are delivering to ~22k impressions each.
The account can *serve* IG placements; the connector cannot *enumerate* the IG account as an
advertising asset.

**Hypothesis, not established fact:** the ad account has **no owning business** (§1), and IG
accounts are normally assigned to an ad account through Business Manager. The other candidate is
that `instagram_basic` was never granted to the connector app. ⚠ Both produce an identical empty
array — this session could not tell them apart, and neither should be written down as the cause
until someone looks at Business Settings.

**What this blocks today:** anything taking an IG account id as *input* — most importantly
`ads_boost_ig_post` (creating a new boost from an organic IG post) and listing IG media. Reading
and managing the existing campaigns is unaffected.

**What it does not block:** ordinary ads with Instagram placements, which run off the Page.

## 6. Where this is going

Ed's stated goal, 2026-09-04: **a dashboard, with the ads managed through MCP.** Two notes for
whoever picks that up:

- ⚠ **The dashboard does not belong in this repo.** This is an App Store client for readers.
  `senpai-backend` already has an ops console with an Observability screen and a live
  `RENDER_API_KEY` read-only-by-convention boundary — that is the shape and the home. See
  `senpai-backend/.claude/decisions/0052-meta-ads-mcp-is-the-ads-surface.md`.
- ⚠ The organic IG pipeline already exists on the backend
  (`senpai-backend/.claude/decisions/0049-ig-creative-pipeline.md`, `CRONOGOL.md` §113) and ends
  at a **Hygraph draft a human approves**. Paid promotion of those same posts is the obvious
  join, and it inherits that decision's posture: **the human is the gate.**

## 6b. The optimization pass — read it before proposing any ads change

A read-only diagnostic over the first $237.55 of boosts was run **2026-09-04** and published as
**"Zona de Descenso"** — https://claude.ai/code/artifact/f0a799da-12db-435a-acba-5c99710e3ef5

⚠ **It lives in the backend, which owns this domain:**
`senpai-backend/.claude/meta-ads-optimization-2026-09-04.md`, with the page source at
`senpai-backend/.claude/artifacts/zona-de-descenso.html`.

Its one load-bearing finding: across nine campaigns whose targeting is **effectively identical**,
**the share of budget spent OUTSIDE Reels predicts cost per click at r² = 0.93**. Reels costs
$0.0325 per click on this account; Feed costs $0.1055. ⚠⚠ Placement is the **symptom** — the cause
is **creative format**, because a static image cannot win Reels inventory. So the lever is shipping
9:16 vertical video, NOT restricting placements (which would starve delivery instead).

⚠ Also recorded there: the hourly analysis is **blocked** on an unestablished ad-account time zone
(the audience is in Spain, the hours are not), and two of Meta's own diagnostics return no data at
this spend level.

## 7. Connector state

| Server | State |
| --- | --- |
| claude.ai **Meta MCP** (`mcp__claude_ai_Meta_MCP__*`) | ✅ Connected, read-verified 2026-09-04 |
| `meta-ads` (separately configured) | ⛔ **Not authorized** — needs OAuth in an interactive session. Redundant with the above; nothing here needs it |
| `render` | ⛔ Failed to connect this session — *"Incompatible auth server: does not support dynamic client registration"* |
