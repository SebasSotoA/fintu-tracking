# `@fintu/brand`

Shared CSS tokens for Fintu’s dashboard and marketing site.

**Source of truth:** the six-color board in `tokens.css` (spring-green, green, dark-green, white, gray, black). Light paper uses `--white` with `--green` as the CTA; dark uses `--black` with `--spring-green` as the CTA. Copy values from this package, do not invent a third palette.

**Not runtime:** `docs/inspo-toolkit.json` is a styleboard dump for inspiration only. Do not import it here or treat its hex values as canonical.

## Usage

```css
@import "@fintu/brand/fonts.css";
@import "@fintu/brand/tokens.css";
@import "@fintu/brand/theme.css";
```

- `fonts.css` — self-hosted DM Sans (variable) and JetBrains Mono. Apps must not load these from Google Fonts or `next/font/google`.
- `tokens.css` — `:root` / `.dark` CSS variables, including `--primary-text` for readable green copy on paper/black
- `theme.css` — Tailwind `@theme inline` mappings (font **family names** only; files come from `fonts.css`)

Landing-only atmosphere (`--landing-glow-*`) stays in the marketing stylesheet, not in this package.
