# Edit homescreen — Board edit mode

ADR 0158: the Board is the user's, not ours. Every panel can be reordered,
removed and put back. The live match panel is pinned and not editable.

Screens: `shot-view.png` (view) · `shot-edit.png` (editing) ·
`shot-edit-long.png` (full scroll, add tray + reset).
Printable spec: `Edit Homescreen Spec.dc.html`.

## Enter / exit
- `EDIT` chip in the crown, view mode only → edit mode on.
- `DONE` pill (same slot) → edit mode off. Changes are already committed.
- Account avatar is hidden while editing (DONE owns the top-right slot).

## Edit chrome
- Hint bar: `Drag to reorder · tap − to remove` + count `6 OF 8 ON`.
  Background rgba(6,11,10,.5), radius 14, 0.5px rgba(255,255,255,.1).
- Editable cards cap at 104px, 10px gap, scrim rgba(7,12,11,.93) + 3px blur,
  radius 24.
- Row: remove circle 26px (#ff5c47 on #160404) · name 600/15 single line ·
  drag handle 34px radius 11 rgba(255,255,255,.1).
- Dragging: scale 1.015, shadow 0 22px 44px rgba(0,0,0,.55), z-index 20.

## Reorder
Drag starts on pointerdown on the handle only. Heights measured once at drag
start; Y axis only. Swap fires past half the neighbour's height + 6px. Only
visible, eligible cards participate. Order commits during the drag.

## Remove / add / reset
- `−` hides the card immediately; it moves to the add tray. No confirm, no undo.
- Tray: `CARDS YOU CAN ADD`, dashed rows, lime `+` (#c8f25a on #101806),
  name + one-line description. Tap the row to add; the card returns to its
  remembered slot in the order.
- Empty tray: `Every card is on your board.`
- `Reset to default layout` (44px outlined) restores default order + hidden set.

## Catalogue
| id | label | shown when | default |
|---|---|---|---|
| last | Last result | no live match | on |
| next | Next up | no live match | on |
| news | News | follows ≥1 club | on |
| results | Finished today | always | on |
| upcoming | Rest of the round | follows ≥1 club | on |
| counters | Counters | follows ≥1 club | on |
| table | Table snapshot | always | off |
| season | Season so far | always | off |

## Copy
| key | en | es |
|---|---|---|
| bdEditLabel | EDIT | EDITAR |
| bdDone | DONE | LISTO |
| bdHint | Drag to reorder · tap − to remove | Arrastra para ordenar · toca − para quitar |
| bdCount | 6 OF 8 ON | 6 ACTIVAS DE 8 |
| bdAdd | CARDS YOU CAN ADD | TARJETAS QUE PUEDES AÑADIR |
| bdAllOn | Every card is on your board. | Ya tienes todas las tarjetas. |
| bdReset | Reset to default layout | Volver al orden original |

## State
- `bdOrder: string[]` — full order including hidden cards.
  Default `['last','next','news','results','upcoming','counters','table','season']`.
- `bdHidden: string[]` — default `['table','season']`.
- `bdEdit: boolean` — screen state, not persisted with the layout.
- Order + hidden set are per user and survive relaunch.

## Prototype hooks
`AltaGama FC iOS.dc.html` accepts `boardEdit` (open straight into edit mode)
and `boardScroll` (land at a scroll offset) so any state above can be
reproduced for QA or screenshots without a tap.
