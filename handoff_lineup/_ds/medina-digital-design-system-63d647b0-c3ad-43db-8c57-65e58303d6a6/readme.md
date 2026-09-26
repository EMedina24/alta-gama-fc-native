# Medina Digital design system

Medina Digital LLC is a privately held parent company that designs, launches and operates its own ventures — today Alta Gama FC (a football club and apparel label run as one business), with more in development. This system was distilled from the company's own one-page site and the visual direction the founder supplied as a reference image (a light "app frame" dashboard aesthetic: white cards on a lavender-grey ground, black pill actions, thin-line icons).

Sources: the mounted local folder `design_system_export/` (a prior export of this system — tokens, components, guideline cards, the site as a UI kit, `assets/mark.svg`), imported here verbatim. No Figma links, GitHub repos or licensed font binaries were provided.

## Content fundamentals

- Voice: first-person plural, plain and declarative. "We build, launch and keep." "We carry the inventory, the audience and the risk."
- Sentence case everywhere, including nav and buttons ("Get in touch", "Send message"). No title case, no exclamation marks, no emoji.
- Short lines. Headlines are one idea, ≤ 6 words ("The company behind the companies."). Descriptions are one sentence.
- Labels are nouns, not verbs ("Ventures", "Background", "Prior work", "In development"). Status reads as a state word next to a dot ("Active").
- Numbers are plain ("1 active venture", "Est. 2024"). No stats padding.

## Visual foundations

- Frame: the whole page sits inside one large rounded panel (`--md-radius-frame`) of `--md-ground` on a cool grey backdrop gradient, with an ambient frame shadow. Nothing bleeds to the browser edge.
- Colour: near-black ink on white cards on lavender-grey ground. One accent (periwinkle `--md-accent`) used as tint fills, hairline hatch, dots and small text — never as a flood or gradient. Status greens/reds appear only as dot + tint pill.
- Type: Outfit only. Headings at 400, body at 300, labels/buttons at 500. Hierarchy is size and space, never weight. Tight tracking on display sizes.
- Cards: white, 28px radius, no border, no resting shadow. On hover they lift 3px and gain a soft ambient shadow. A signature "notch" corner carves the top-right of a card in ground colour, holding a 56px circular action button (see NotchCard).
- Media inside cards: 20px radius, soft lavender gradient placeholder.
- Chips & pills: fully round; light `--md-chip` fill, or white with a 36px leading icon orb and a 1px-ish ambient shadow. Status pills are tint + 6px dot + tinted text.
- Buttons: black pill with white text and a leading/trailing 38px icon "orb" at 14% white; the orb nudges (2px,-2px) on hover. Secondary is a hairline-bordered pill; icon-only is a white circle that inverts to black on hover.
- Inputs: `--md-chip` fill, no border at rest, 16px radius, 52px tall; focus turns the fill white with a 1px ink border. Focus ring is 2px accent.
- Tables/lists: header row in a `--md-chip` tile (14px radius, muted 13px labels); rows separated by hairlines with a 38px initials orb, hover to `--md-row-hover`.
- Texture: diagonal 135° hatch of accent at 16% every 9px on tinted "in development" surfaces and in the hero art.
- Motion: one easing (`--md-ease` = cubic-bezier(.32,.72,0,1)), 500–700ms. Cards/text reveal on scroll with a 28px fade-up at 900ms, staggered 70ms. Hover = lift; press = scale .97. Reduced-motion is honoured (canvas freezes).
- Imagery: photographs go inside the 20px media wells; prefer clean, bright, product-style shots. Avatars are 72px circles.
- Layout: 12-column bento (7/5 split) with 14px gaps, collapsing to a single column below 860px. Sections are cards; the page is a stack of cards with 14px gaps.

## Iconography

Thin-line icons only: 1.5px-equivalent strokes (Phosphor Light / Thin weight), round caps. Used inside 36–38px orbs or at 14–16px inline in chips. No filled icons, no emoji, no unicode glyph icons. The site's icons are inline Phosphor-style SVG paths (arrow-up-right, envelope, house, plus/circle, checkmark). Load Phosphor from CDN in new work: `https://unpkg.com/@phosphor-icons/web` (class `ph-light ph-<name>`).

The Medina mark is the chevron "M" in a black 11px-radius tile (`assets/mark.svg`) — authored for this project, not a supplied brand asset.

## Index

- `styles.css` — entry; imports `tokens/*`.
- `tokens/` — fonts, colors, typography, spacing (radii, shadows), motion.
- `guidelines/` — foundation specimen cards.
- `components/core/` — Button, IconButton, Chip, StatusPill, Card, CardTitle, MediaWell, NotchCard, Input, Textarea, NavBar, NavPill, ListHeader, ListRow, Icons (ArrowUpRight, Check, Envelope, House, Mark) (+ card HTML).
- `ui_kits/medina-site/` — the live site as a UI kit / starting point.
- `assets/mark.svg` — brand mark.
- `SKILL.md` — agent skill wrapper.
- `thumbnail.html` — homepage tile.

## Caveats

- Outfit is loaded from Google Fonts; no font binaries were supplied.
- Component inventory was derived from the site, not a Figma/code source; Select, Dialog, Toast etc. were intentionally not invented.
