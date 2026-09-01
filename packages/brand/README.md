# `@fintu/brand`

Shared CSS tokens for Fintu’s dashboard and marketing site.

**Source of truth:** the current dashboard/app tokens (navy, indigo-600 primary, radius, Inter + JetBrains Mono). Copy values from the app, do not invent a third palette.

**Not runtime:** `docs/inspo-toolkit.json` is a styleboard dump for inspiration only. Do not import it here or treat its hex values as canonical.

## Usage

```css
@import "@fintu/brand/tokens.css";
@import "@fintu/brand/theme.css";
```

- `tokens.css` — `:root` / `.dark` CSS variables, including `--primary-text` for readable indigo copy on navy
- `theme.css` — Tailwind `@theme inline` mappings (font **family names** only; apps load font files themselves)

Landing-only atmosphere (`--landing-glow-*`) stays in the marketing stylesheet, not in this package.
