# Product intro modal — UI spec

Status: **design only**. T-03 implements the component and AppShell wiring. Do not commit this file as a feature; do not wire `AppShell` here.

Sequence (locked): `SetupModal` (country / broker, not dismissible) closes → this intro opens **over the live dashboard**. English copy now; Spanish in T-03.

This is **not** the auth surface. Do not use `auth-light`, `auth-shell`, `bg-white`, or paper cards from `frontend/app/auth/auth-shell.css`. The dashboard is already on screen; the intro is glass sitting on it.

---

## Visual direction

**Ledger glass over a living book.** The dashboard (net worth, KPI strip, holdings) stays visible through a frosted, dimmed overlay — you can still read that a portfolio lives behind the panel. The modal itself is a **statement plate**: a 3px indigo ledger rail on the leading edge, a JetBrains Mono kicker (`01 / 03`), and an **asymmetric vignette** — a mini dashboard KPI card that changes with each slide.

That vignette is the one memorable choice. It is not a centered empty card, not a mascot, not a spotlight tour of the sidebar or bottom nav.

| Surface | Treatment |
|---------|-----------|
| Auth (contrast) | Paper-white `bg-white` cards, `auth-light`, no dashboard behind |
| SetupModal | Standard dialog / drawer, blocking, no skip |
| **This intro** | Dashboard glass (`from-white/[0.07] to-card`, `border-white/10`, `backdrop-blur`), skippable, overlay blur **only here** |

Discovered system (do not replace):

```
Main:       DM Sans (font-sans)
Mono:       JetBrains Mono (font-mono) — kickers, FX sample, “?”
Tailwind:   v4 CSS-first
Tokens:     OKLCH via packages/brand/tokens.css
Accent:     indigo primary (--primary / navy canvas)
Dark wired: yes (.dark + glass tokens)
```

No Inter. No raw hex except existing shadow recipes already used on `Card`.

---

## Placement and overlay

- Centered on **desktop** (`md+`, `useIsMobile` false): `ResponsiveDialog` → `Dialog`.
- Bottom **drawer** on mobile (`<768px`, 375px first): `ResponsiveDialog` → `Drawer` (`shouldScaleBackground={false}` already).
- Overlay: dashboard visible, **blur + dim**. Not a solid blackout. Not a hole/spotlight on nav.
- Overlay click and Escape = **Skip** (same as the Skip control). Contrast with `SetupModal`, which sets `dismissible={false}` and prevents outside / Escape.

### Overlay — this dialog only

`DialogOverlay` / `DrawerOverlay` default is `bg-black/50` with **no** backdrop blur. **Do not change that default string.** Other modals stay as they are.

`ResponsiveDialogOverlay` already forwards `className` to the primitive overlay. `DialogContent` and `DrawerContent` currently mount `<DialogOverlay />` / `<DrawerOverlay />` with **no** className, so a sibling `ResponsiveDialogOverlay` would double-paint unless content stops injecting the default overlay.

**T-03 implementation (pick one; both keep global overlay unchanged):**

1. **Preferred.** Add optional `overlayClassName?: string` to `DialogContent`, `DrawerContent`, and `ResponsiveDialogContent`. Pass it through to the existing overlay via `cn(default, overlayClassName)`. Defaults remain `bg-black/50`. Product intro is the only caller that passes blur classes.
2. **Compose.** For this modal only: `ResponsiveDialogPortal` + `ResponsiveDialogOverlay className={...}` + content that does **not** render its own overlay.

Exact overlay classes (pass as `overlayClassName` or as `ResponsiveDialogOverlay` `className`):

```
bg-foreground/20 backdrop-blur-md
dark:bg-background/50 dark:backdrop-blur-md
motion-reduce:backdrop-blur-none
motion-reduce:bg-foreground/40
dark:motion-reduce:bg-background/75
```

| Do | Don’t |
|----|--------|
| Dim with `foreground` / `background` alpha + blur | `bg-black`, `bg-black/80`, opaque `#000` scrim |
| `backdrop-blur-md` (8px) on overlay | Copy `DialogContent`’s `backdrop-blur-[12px]` onto the overlay (too heavy; panel already blurs) |
| `motion-reduce:backdrop-blur-none` + stronger dim | Keep expensive blur when reduced motion is on |

z-index stays `z-50` (same as dialog / drawer / mobile tab bar). Overlay covers the whole viewport including bottom nav — the nav is part of the blurred dashboard, not a tour target.

---

## Copy (EN, source: FINTU.md)

Title + **one** paragraph per slide. No extra marketing sentences. No Spanish in this spec.

| Slide | Title (`DialogTitle`) | Body (`DialogDescription`) |
|-------|----------------------|----------------------------|
| 1 | The question | After fees and FX, are you making or losing? |
| 2 | Record cash | Deposits, withdrawals, and the broker’s actual FX when money moved. |
| 3 | Record trades, then read | Buys/sells on Trades; Dashboard and Performance answer the question. |

Controls (every slide unless noted):

| Control | Label | Variant |
|---------|-------|---------|
| Skip | Skip | `Button variant="ghost"` |
| Primary (slides 1–2) | Next | `Button variant="default"` |
| Primary (slide 3) | Get started | `Button variant="default"` |

No Back. No close **X** (`showCloseButton={false}`). Skip is the explicit dismiss.

T-03 may move strings into locale keys; until then hardcode EN.

---

## Layout

### Desktop (≥768px)

Centered dialog, `sm:max-w-xl` (36rem) — wide enough for vignette + copy, not a marketing hero. Vertically centered. Dashboard KPIs readable through the frost.

```
┌──────────────────────────────── overlay (blur + dim) ────────────────────────────────┐
│                                                                                      │
│              ┌─ 3px bg-primary rail ─────────────────────────────────────────────┐   │
│              │  font-mono  01 / 03                         ○ ● ○                 │   │
│              │                                                                   │   │
│              │  ┌ vignette ─────┐    The question                                │   │
│              │  │  glass KPI    │                                                │   │
│              │  │  (slide art)  │    After fees and FX, are you                  │   │
│              │  │  w-36 / h-32  │    making or losing?                           │   │
│              │  └───────────────┘                                                │   │
│              │                                                                   │   │
│              │  Skip                                          [ Next ]           │   │
│              └───────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Rail: `absolute inset-y-0 left-0 w-[3px] bg-primary rounded-l-xl` (decorative, `aria-hidden`).
- Kicker + dots on one row: `justify-between`.
- Body row: `grid grid-cols-[9rem_1fr] gap-6 items-center`.
- Title **left-aligned** (`text-left`), body `max-w-prose` (~45–75ch).
- Footer: Skip left, primary right, `justify-between`.

### Mobile (375px first, `<768px`)

Bottom drawer. Vignette becomes a **full-width horizontal strip** above the title (not a second column). Handle from `DrawerContent` stays.

```
┌──────────── 375 ────────────┐
│     (blurred dashboard)     │
│ ┌─────────────────────────┐ │
│ │         ── handle       │ │
│ │ █ primary rail (top, 3px)│ │
│ │ ┌── vignette strip ───┐ │ │
│ │ │  KPI schematic      │ │ │
│ │ └─────────────────────┘ │ │
│ │ 01 / 03          ○ ● ○  │ │
│ │ The question            │ │
│ │ After fees and FX…      │ │
│ │                         │ │
│ │ [ Skip ]  [ Next     ]  │ │
│ │         pb-safe         │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- `text-left` even on the drawer (override default `DrawerHeader` `text-center`).
- Footer: two equal columns, `grid grid-cols-2 gap-2`, both `h-11` (44px+).
- Fit without inner scroll on 375×667: vignette `h-20`, short copy, no extra sections.
- If keyboard / large type overflows: `DialogScrollBody` only around title+body; footer stays pinned.

---

## Component tree

T-03 files (suggested). Design does not implement them.

```
ProductIntroModal                         // open, onSkip, onComplete
  ResponsiveDialog                        // dismissible={true}
    ResponsiveDialogContent               // overlayClassName, showCloseButton={false}
      │                                     // OR Portal + ResponsiveDialogOverlay + content
      ├─ ledger rail (div, aria-hidden)
      ├─ header row
      │    ProductIntroKicker             // "01 / 03"
      │    ProductIntroDots               // 3 indicators, not buttons
      ├─ ProductIntroStage                // grid → stack at md
      │    ProductIntroVignette           // slide 1 | 2 | 3 schematic
      │    ResponsiveDialogHeader
      │      ResponsiveDialogTitle
      │      ResponsiveDialogDescription
      └─ ResponsiveDialogFooter
           Button Skip                    // ghost
           Button Next | Get started      // default, autoFocus
```

Do **not** reuse `OnboardingProgress` (that is a 2-step country/broker bar). Dots are a different control.

Props (for T-03; not wired here):

```ts
interface ProductIntroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void  // false → Skip
  onComplete: () => void                 // Get started
}
```

Slide state is internal (`1 | 2 | 3`). Skip and overlay/Escape call the same dismiss path as `onOpenChange(false)`.

---

## Token usage

### Surfaces

| Role | Classes |
|------|---------|
| Dialog / drawer plate | `relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-card text-card-foreground shadow-[0_12px_32px_rgba(0,0,0,0.38)] backdrop-blur-md` |
| Override DialogContent default | Replace `bg-background/72` with the plate classes above on **this** `className` only |
| Mobile drawer plate | Same glass; add `bg-card/90` so the sheet is not a solid `bg-background` slab |
| Vignette | Same recipe as `Card`: `rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-card backdrop-blur-md` plus top hairline `before:via-white/25` (copy from `card.tsx`) |
| Ledger rail | `bg-primary` |
| Overlay | See overlay section |
| `--glass` | Dark-only in `tokens.css`. Do **not** use `bg-glass` — it is unset in light. Use the Card gradient recipe so both themes work. |

### Typography

| Role | Classes |
|------|---------|
| Kicker | `font-mono text-xs font-medium tabular-nums tracking-widest text-muted-foreground` → `01 / 03` |
| Title | `font-sans text-xl font-semibold leading-tight tracking-tight text-foreground md:text-2xl` |
| Body | `font-sans text-sm leading-relaxed text-muted-foreground` |
| Vignette label | `text-[10px] font-medium uppercase tracking-wide text-muted-foreground` (same as `KpiTile`) |
| Vignette figure | `font-mono text-2xl font-bold tabular-nums text-foreground` |
| Vignette caption | `font-mono text-[11px] tabular-nums text-muted-foreground` |
| Buttons | Default `Button` (`text-sm font-medium`) |

Base 16px. Body ≥ 1.5 line-height via `leading-relaxed`. Do not use Inter.

### Spacing (Tailwind scale only)

| Region | Classes |
|--------|---------|
| Dialog padding | `p-0` on content; inner `px-6 pt-6 pb-6` / drawer `pb-safe` |
| Stage gap | `gap-6` |
| Title → body | `gap-2` in header |
| Footer | `gap-2`, `pt-6` |
| Dot gap | `gap-2` |
| Mobile footer | `px-6 pb-6 pb-safe` |

No `p-[13px]` / arbitrary spacing. Arbitrary `w-[3px]` rail is the documented exception (hairline, not layout padding).

### Color (semantic only)

| Use | Token |
|-----|--------|
| Title | `text-foreground` |
| Body / kicker | `text-muted-foreground` |
| Primary CTA | `bg-primary text-primary-foreground` (Button default) |
| Skip | ghost → `text-foreground` / hover `bg-accent` |
| Making | `text-success` (vignette 1 up arrow) |
| Losing | `text-destructive` (vignette 1 down arrow) |
| Focus | `focus-visible:ring-ring/50` (Button already) |
| Active dot | `bg-primary` |
| Idle dots | `bg-muted` |

Color is never the only signal: arrows + `?` + labels sit with green/red.

---

## Vignette (memorable visual)

Static Lucide outlines + mono type. No emoji. No photos. No live portfolio data (empty-state users still see the same art).

### Slide 1 — The question

Mini KPI: label `After costs`, figure `?`, both trend arrows.

```
┌──────────────────┐
│ AFTER COSTS      │
│        ?         │
│  ↗     ↘         │
│ making  losing   │
└──────────────────┘
```

- `?` → `font-mono text-2xl font-bold text-foreground`
- `ArrowUpRight` `text-success` + `ArrowDownRight` `text-destructive` (`size-3`, `aria-hidden`)
- Captions `making` / `losing` in `text-[11px] text-muted-foreground`

### Slide 2 — Record cash

Money path, not a form.

```
┌──────────────────┐
│ CASH MOVED       │
│  COP → USD       │
│  4,012.50        │
│  broker FX       │
└──────────────────┘
```

- `ArrowLeftRight` (`size-4`, `text-primary`)
- Sample rate in `font-mono tabular-nums` — illustrative, not a live quote
- Do not pull `MARKET_CONFIG` into the spec art if it adds a second locale path; T-03 may swap `COP` for the user’s local code **without** changing layout

### Slide 3 — Record trades, then read

Three stacked chips (schematic destinations, **not** the real nav):

```
┌──────────────────┐
│ DAILY LOOP       │
│  Trades          │
│  Dashboard       │
│  Performance     │
└──────────────────┘
```

- Each chip: `rounded-md bg-primary-container/80 px-2 py-1 text-xs font-medium text-on-primary-container`
- Order matches the daily loop: trades, then read dashboard / performance
- Not clickable. Not a clone of `AppNav`.

Slide change: crossfade vignette + copy `duration-150`. Reserve `h-32 w-36` (desktop) / `h-20 w-full` (mobile) so the plate does not jump (CLS).

---

## Step dots

Three dots, **indicators only** (not a second navigation). Skip / Next are the only move controls.

```
<nav aria-label="Intro progress">
  <!-- three spans, role="presentation" -->
</nav>
```

Expose step via the kicker and `aria-live="polite"` on the kicker: `Step 2 of 3`. Title already names the slide.

| State | Classes |
|-------|---------|
| Idle | `h-2 w-2 rounded-full bg-muted` |
| Current | `h-2 w-2 rounded-full bg-primary` (or `w-4` pill `h-2 w-4 rounded-full bg-primary`) |
| Done | same as idle — no checkmarks |

Hit area: dots are not buttons, so 8px is fine. Do not make 8px tap targets.

---

## Interaction states

### Skip (all slides)

- `Button variant="ghost" size="default"` → `h-11 md:h-9`, mobile full-column `h-11`
- Hover / focus / active: existing Button ghost
- Action: close intro, same as overlay click and Escape. Do not advance slides.
- `aria-label="Skip intro"` if visible label is only “Skip”

### Next (slides 1–2)

- `Button variant="default"` (indigo, existing primary shadow)
- Increments slide. `autoFocus` so Radix does not land on Skip first
- `type="button"`

### Get started (slide 3)

- Same primary Button, label **Get started**
- `autoFocus` when slide becomes 3
- Action: `onComplete()` then close. T-03 decides persistence (e.g. localStorage / profile flag). Design: one-shot; do not reopen on every dashboard visit after complete/skip

### Overlay click

- `dismissible={true}` (default)
- `onInteractOutside`: **allow** (do not `preventDefault`)
- Maps to Skip, not Next

### Escape

- Default Dialog / Drawer Escape → `onOpenChange(false)` → Skip
- Do **not** `onEscapeKeyDown` preventDefault (SetupModal does; this must not)

### Drawer swipe / handle

- Vaul dismiss (drag down) = Skip
- Keep `dismissible={true}`

### Keyboard

| Key | Result |
|-----|--------|
| Tab | Skip ↔ primary (footer); focus ring from Button |
| Enter / Space on focused button | Activate that button |
| Escape | Skip |
| Arrow keys | **No** slide change (avoids fighting drawer gestures) |

Focus trap: Radix / Vaul. On open, focus primary CTA (`autoFocus`). Restore focus to the app on close (default).

### Reduced motion

Use `motion-reduce:` and/or `usePrefersReducedMotion()` (already in `frontend/hooks/use-prefers-reduced-motion.ts`).

| Motion | Default | `prefers-reduced-motion: reduce` |
|--------|---------|----------------------------------|
| Dialog / drawer enter | existing `animate-in` / zoom 200ms | **Skip enter animation:** `motion-reduce:animate-none motion-reduce:duration-0` on **this** content `className` |
| Overlay fade | `fade-in-0` | Instant; no blur (classes above) |
| Slide crossfade | 150ms opacity | Instant swap, no fade |
| Button `active:scale-[0.98]` | keep (tiny) | `motion-reduce:active:scale-100` if easy; not required |
| Overlay blur | `backdrop-blur-md` | `motion-reduce:backdrop-blur-none` + stronger dim |

Do not add a carousel swipe animation.

---

## Exact `className` recipes

### Overlay (this instance only)

```
bg-foreground/20 backdrop-blur-md dark:bg-background/50 dark:backdrop-blur-md motion-reduce:backdrop-blur-none motion-reduce:bg-foreground/40 dark:motion-reduce:bg-background/75
```

### `ResponsiveDialogContent` (desktop + extra)

```
flex max-h-[100dvh] md:max-h-[90vh] flex-col gap-0 p-0 sm:max-w-xl overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-card text-card-foreground shadow-[0_12px_32px_rgba(0,0,0,0.38)] backdrop-blur-md motion-reduce:animate-none motion-reduce:duration-0
```

### Mobile drawer extras (same `className`, stacks with DrawerContent)

```
bg-card/90
```

Drawer default is `bg-background`; the glass classes above must win (`cn` order: pass these on the instance).

### Ledger rail

```
pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-primary md:rounded-l-xl max-md:inset-x-0 max-md:top-0 max-md:bottom-auto max-md:h-[3px] max-md:w-full max-md:rounded-t-xl
```

Desktop: vertical leading edge. Mobile: 3px bar along the top of the sheet (under the handle).

### Inner padding

```
relative flex flex-1 flex-col gap-6 px-6 pt-6
```

Footer:

```
flex flex-col-reverse gap-2 px-6 pb-6 pb-safe sm:flex-row sm:items-center sm:justify-between
```

Mobile override: `max-md:grid max-md:grid-cols-2 max-md:flex-none` so Skip | Next sit on one row at 375.

### Stage

```
grid grid-cols-1 items-center gap-6 md:grid-cols-[9rem_minmax(0,1fr)]
```

### Vignette shell

```
relative flex h-20 w-full flex-col justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-card px-4 py-3 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3),0_2px_4px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md md:h-32 md:w-36 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:content-['']
```

### Header

```
flex flex-col gap-2 text-left
```

Title extra: `text-xl font-semibold tracking-tight md:text-2xl`

Description extra: `text-sm leading-relaxed`

### Dots row

```
flex items-center justify-between gap-4
```

Dots cluster: `flex items-center gap-2` with current `h-2 w-4 rounded-full bg-primary` and idle `h-2 w-2 rounded-full bg-muted`

### Skip / Next

Use `Button` variants as specified. Do not restyle primary to auth white. Do not add a second outline “Skip intro” link.

---

## A11y checklist

- `ResponsiveDialogTitle` / `Description` bound to the current slide (update text; one dialog, not three).
- `aria-live="polite"` on the kicker when the slide changes.
- Vignette `aria-hidden` (decorative; copy is in the description).
- Contrast: title `foreground` on `card`; body `muted-foreground` on `card` — verify ≥4.5:1 in **both** light and `.dark`.
- Overlay dim must not drop body text in the **panel** below 4.5:1 (panel is opaque-enough glass, not the overlay).
- Touch: Skip and primary ≥44px on mobile (`h-11`).
- No hover-only actions.
- Focus rings: do not strip Button rings.
- Lucide only; no emoji.

---

## Contrast with SetupModal (T-03 must not copy blindly)

| | SetupModal | Product intro |
|--|------------|----------------|
| When | `!onboarding_completed` | After setup **closes** |
| Dismiss | Blocked | Overlay / Escape / Skip |
| Close X | Hidden | Hidden |
| Progress | `OnboardingProgress` bar | Dots + mono kicker |
| Overlay | Default `bg-black/50` | Blur + token dim, this instance only |
| CTA | Continue / Finish | Next / Get started |
| Copy | Country / broker | FINTU daily loop |

Do **not** implement the `AppShell` branch in this design task. T-03: after `setOpen(false)` on setup, show this modal over the dashboard (including the empty dashboard). Skipping setup is impossible; skipping intro is required.

---

## Out of scope

- AppShell / profile flag / localStorage persistence
- Spanish strings
- Spotlight, coach marks, or pulsing nav items
- Changing `DialogOverlay` / `DrawerOverlay` defaults
- New color tokens, new fonts, Inter
- Illustrations, Lottie, or images
- Back button, skip confirmation dialog, or “don’t show again” checkbox (Skip is enough)

---

## T-03 acceptance (visual)

1. 375px drawer: title + one paragraph + vignette + dots + Skip + Next, no horizontal scroll, `pb-safe`.
2. Desktop: centered `max-w-xl` glass plate, vignette left of copy, dashboard readable through overlay blur.
3. Overlay is not a blackout; other dialogs (setup, trade forms) still use default `bg-black/50` without blur.
4. Skip / overlay / Escape all dismiss; last slide primary is **Get started**.
5. Reduced motion: no enter zoom; overlay may drop blur and rely on dim.
6. Light and dark both use dashboard glass, never auth paper-white.
