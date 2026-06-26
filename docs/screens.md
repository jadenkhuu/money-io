# Screens & navigation (reference)

Structure only — placement and relationships, not visual design. Numbers are
placeholders. The outer box is the centered mobile-width column; the bottom bar
is identical on every tab.

## Pages vs overlays

```
PAGES (tabs — bottom bar always visible, no back needed):
   /          Home
   /activity  Activity
   /owed      Owed
   /more      More

OVERLAYS (sheets — slide up, dismiss with close or swipe):
   +                 New entry        (from any tab)
   tap owed person   Settle           (over Owed)
   tap a transaction Detail / edit    (over Home or Activity)
```

## Tabs

```
   HOME (glance)                    ACTIVITY (log + analytics)
┌────────────────────────────┐   ┌────────────────────────────┐
│ This month                 │   │ Activity                   │
│   net    +420              │   │                            │
│   in 1,240    out 820      │   │  [ income vs spending ]    │
│                            │   │  [ category breakdown  ]   │
│ Forecast                   │   │                            │
│   on pace  +X by Jun 30    │   │  month ▾    type ▾  (filter)│
│   [────────pace────]       │   │                            │
│                            │   │  All transactions          │
│ Owed to you    75    ›     │   │   Lunch        -18   Jun 24│
│                            │   │   Pay         +900   Jun 24│
│ Recent                     │   │   Groceries    -54   Jun 23│
│   Lunch        -18         │   │   Coffee        -6   Jun 23│
│   Pay         +900         │   │   Rent        -800   Jun 21│
│   Groceries    -54         │   │   …                        │
│   see all ›                │   │                            │
├────────────────────────────┤   ├────────────────────────────┤
│ Home  Activity + Owed  More│   │ Home  Activity + Owed  More│
└────────────────────────────┘   └────────────────────────────┘

   OWED (ledger)                    MORE (settings)
┌────────────────────────────┐   ┌────────────────────────────┐
│ Owed to you                │   │ More                       │
│   total outstanding  75    │   │                            │
│                            │   │   Categories          ›    │
│   James           50   ›   │   │   Account             ›    │
│   Sarah           25   ›   │   │   Archive             ›    │
│                            │   │   Settings            ›    │
│   (tap a person → settle)  │   │                            │
├────────────────────────────┤   ├────────────────────────────┤
│ Home  Activity + Owed  More│   │ Home  Activity + Owed  More│
└────────────────────────────┘   └────────────────────────────┘
```

## Entry sheet (the `+`)

Overlay that slides up over the current tab; context stays behind it.

```
┌────────────────────────────┐
│  (current tab, dimmed)     │
│ ┌────────────────────────┐ │
│ │ New entry           x  │ │
│ │      0.00              │ │   amount (big)
│ │  [expense] [income]    │ │
│ │  category:  Food  …    │ │
│ │  note ____   date today│ │
│ │  › I paid for others   │ │   expands to split
│ │   7  8  9              │ │   numpad on touch;
│ │   4  5  6              │ │   hardware keys on desktop
│ │   1  2  3              │ │
│ │   .  0  <-             │ │
│ │       [  Save  ]       │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ Home  Activity + Owed  More│
└────────────────────────────┘
```

## Settle sheet (tap a person in Owed)

```
┌────────────────────────────┐
│ ┌────────────────────────┐ │
│ │ James owes you      x  │ │
│ │      50                │ │
│ │   [ Mark paid ]        │ │
│ │   [ Partial   ___ ]    │ │
│ │       [  Done  ]       │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ Home  Activity + Owed  More│
└────────────────────────────┘
```

## Design direction

**Chosen: hybrid ASCII data-viz.** Clean, minimal layout/chrome (not box-drawing
everywhere) + **character-based data viz** (bar meters like `███░░░`, sparklines
like `▁▂▅▇`) + **ambient animated ASCII art** as a signature on Home. Monospace /
tabular numerals for all money. No gradients/shadows/vibrant color.

### Type system — balanced dual register

Two type registers with one rule; the contrast between them *is* the identity.

- **Sans (clean register)** — structural typography: screen titles, labels,
  settings rows, prose, buttons. Minimal, sentence case, generous spacing.
- **Mono (ASCII register)** — everything quantitative/graphic: money amounts
  (with `tabular-nums` so columns align), dates, ASCII bar meters & sparklines,
  the coin, character dividers, the keypad.

Rule of thumb: **if it's a number or a chart → mono; if it's a word you read →
sans.** Reserving mono for data keeps the ASCII meaningful, not decorative.

Faces currently loaded (layout.tsx): Geist Sans (`--font-geist-sans`, default
body) + Geist Mono (`--font-geist-mono`, `font-mono`). Money/data spans:
`font-mono tabular-nums`. (Typeface choice is still open to revisit — the mono is
the signature face and can be swapped for something more characterful later.)

Per surface:
- **Home** — ambient animated ASCII hero; core numbers (net especially) stay
  always-visible; clicking art regions reveals *more detail*, never gates the basics.
- **Activity** — character charts (income-vs-spend sparkline, category bar meters)
  above the transaction list.
- **Owed** — simple list; optional small char meter for settled vs outstanding.
- **More** — settings; includes a **Credits** entry that surfaces `ATTRIBUTIONS.md`
  in-app (required by CC-BY for the coin model).

Tooling notes:
- `pretext` (https://github.com/chenglou/pretext) is a fast text *measurement &
  layout* engine (DOM/canvas/SVG) — NOT an animation lib. Useful here for precise
  monospace grid layout and for click hit-testing (mapping a click to a position
  in an ASCII canvas), which is the hard part of "click a region of the art."
- The animation itself = a `requestAnimationFrame` loop drawing character frames
  into a `<pre>`/canvas, or pre-rendered frame sequences, or an image/3D→ASCII lib
  (three.js `AsciiEffect`, `aalib.js`) if we go that far.

**Signature animation (scoped):** a slowly rotating 3D object — a coin or money
bill — converted to ASCII. Contained to a **small Home card and/or the
create-account / auth page**; NOT app-wide. **Path: pre-rendered.** Spin the 3D
model through three.js `AsciiEffect` once (offline), capture a sequence of ASCII
frames, commit them as an asset, and loop them at runtime — no three.js shipped,
near-zero battery, offline-safe. Pauses off-screen/idle; freezes for
`prefers-reduced-motion`.

Progress:
- **Object** — chosen: Poly Pizza "Coin Dollar Sign" (CC-BY; see `ATTRIBUTIONS.md`),
  at `public/Coin Dollar Sign.glb`.
- **Frame pipeline** — built: three.js + headless Chromium render (lit ambient +
  key/fill/rim/front, GTAO ambient occlusion) → normalized luminance→ASCII →
  `public/coin-frames.json` (120 frames, 64×32, 20fps, ≈6s/rev seamless loop). The
  raised `$` emblem is isolated (Gold2 material mask + rim flood-fill + close) and
  stamped dark as `#`. Component: `src/app/coin-ascii.tsx` (loops frames; pauses
  off-screen/idle; reduced-motion safe; `aria-hidden`/decorative). Generator lives
  in scratchpad — move to `scripts/` for reproducibility.
- **Tuning (open)** — `$` legibility (resolution + raking light), card size, spin speed.
