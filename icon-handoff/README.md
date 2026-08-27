# Alta Gama FC — app icon 1b (Kick-off)

Full-bleed lime field (#c8f25a) with faint mow stripes, mark in #0b1015.
Square masters, **no baked corner radius** — iOS applies the mask.

- `AppIcon.appiconset/` — drop into Xcode (single-size 1024, Xcode 14+).
- `icon-<n>.png` — legacy/explicit rasters if a target still needs them
  (180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 20).

Mark geometry: 42×30 unit box at 66% of tile width, 2.2u stroke, goal boxes
flush to the touchline.

---

⚠ **Nothing in this folder is read by a build.** This is a CNG project: `expo
prebuild` regenerates `Images.xcassets/AppIcon.appiconset` from `app.json` and
overwrites anything else. The only files that reach a build are the ones in
`assets/images/` that `app.json` names. Kept as design source — see
`.claude/HANDOFF.md` traps 22–23 and
`.claude/decisions/0041-app-icon-1b-and-a-splash-of-its-own.md`.
