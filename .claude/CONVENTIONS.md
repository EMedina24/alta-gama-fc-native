# Conventions

These are observed from the current codebase. Changing one of them is itself a
decision — record it in [decisions/](./decisions/).

## Component tiers — atomic design

Per [decisions/0013](./decisions/0013-atomic-design-components.md):

```
src/components/atoms/       primitives; no domain knowledge, no data
src/components/molecules/   small compositions of atoms, one job each
src/components/organisms/   self-contained domain sections
src/components/templates/   page-level layout scaffolding (add when needed)
src/app/                    screens — compose organisms, own routing and fetching
```

- **Dependencies point downward only.** organisms → molecules → atoms. Atoms import
  no other component. If two molecules need the same piece, it is an atom.
- **No data fetching below organisms.** Atoms and molecules are pure and prop-driven.
- **Co-locate an organism's private parts** in its own folder
  (`organisms/standings-table/`); promote to `molecules/` only when a *second*
  organism needs it.
- Import as `@/components/<tier>/<name>`.

## Files & naming

- Route files live in `src/app/`; the filename is the URL segment.
- Component and hook files are **kebab-case** (`themed-text.tsx`, `use-theme.ts`).
- Components are named exports in PascalCase; route files use `export default`.
- Platform-specific implementations use the Metro suffix convention:
  `app-tabs.tsx` (native) + `app-tabs.web.tsx` (web). Import without the suffix.

## Imports

- Always use the `@/` alias for internal modules — never `../../`.
- `@/assets/*` for static assets; images via `require('@/assets/images/...')`.

## Styling & theming

⚠ **The design is in progress and the current tokens are provisional** — see
[decisions/0014](./decisions/0014-app-specific-design-language.md). Do **not** copy
the web app's visual styling, and do not harden a placeholder into a system. Read
`cronogol` for behavior, not for looks.

- Colors, spacing, fonts come from `@/constants/theme`. No hard-coded hex or
  raw pixel spacing in components — add to `Colors`/`Spacing` instead. This is what
  keeps the eventual design swap bounded to tokens and atoms.
- `Spacing` is a 4pt-based scale (`half`…`six` = 2, 4, 8, 16, 24, 32, 64).
- Read the active palette with `useTheme()`; read the raw scheme with
  `useColorScheme()`. Treat `'unspecified'` as `'light'`.
- Use `ThemedView` / `ThemedText` rather than bare `View` / `Text` where text or
  surface color matters.
- Styles go in a `StyleSheet.create` block at the bottom of the file.

## TypeScript

- `strict: true`. No `any` and no `@ts-ignore` without a comment explaining why.
- Prefer `as const` for lookup tables so keys stay literal types.
