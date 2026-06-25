# Money Tracker — Design Spec

**Date:** 2026-06-25
**Status:** Draft for review
**Owner:** Jaden

---

## 1. Overview & goals

A personal, mobile-first web app for tracking **income and spending via manual
entry** (no bank integration). Primary outcome: low-friction awareness of where
money goes, plus a light "did I come out ahead this month?" signal (goal profile:
**awareness/log + a bit of net trajectory**).

Heavy emphasis on UX: fast entry, calm visuals, feels like an app not a website.

### Signature differentiator
Most expense apps conflate **cash flow** (money that moved through your account)
with **true personal cost** (what a thing actually cost *you*). This app separates
them. The headline case: you front a group bill and friends pay you back later.
This app records your **real share** as spending and the remainder as money
**owed to you** (an asset), so your spending and net numbers stay truthful the
whole time — before, during, and after repayment. Refunds and shared costs fall
out of the same engine.

---

## 2. Scope

### Phase 1 (foundation — this spec's build target)
- Single-user auth (Supabase Auth).
- Fast manual transaction entry (income / spend), responsive input (touch numpad + hardware keyboard).
- Hybrid categories (fixed list + create-on-the-fly, persisted).
- **"I paid for others"** split flow → produces an owed-to-me receivable.
- **Owed-to-me ledger** + settle (mark paid / partial), with optional free-text names + per-person rollup.
- **Home**: this-month net (in/out), recent log, category breakdown (one tap deeper), **forecast** (month-end pace projection).
- PWA-installable, single responsive column (mobile-shaped, centered on desktop with soft tinted/gradient sides).

### Phase 2 (fast-follow)
- **Screenshot import**: user shares a screenshot of a bank transaction list →
  parsed by Claude (Anthropic API) → **review queue** of draft rows mapped onto
  the user's category set → user confirms → saved as ordinary transactions.

### Later / explicitly deferred (YAGNI for now)
- Recurring-transaction detection & auto-log.
- Natural-language quick-add ("14 lunch yesterday").
- Multi-user / shared household views (schema leaves the door open via `user_id` + RLS).
- True net-worth with account balances / starting balance.
- Multi-currency.

---

## 3. Core principle: one canonical transaction, modular writers & readers

```
   WRITERS                    CORE                      READERS
 ┌───────────┐                                      ┌──────────────┐
 │  Manual   │──┐         ┌─────────────┐        ┌──│ Home / Log   │
 │  entry    │  │         │ transactions │        │  └──────────────┘
 └───────────┘  ├────────▶│   (+ splits, │───────▶├──┌──────────────┐
 ┌───────────┐  │         │  categories, │        │  │ Forecast     │
 │ Screenshot│──┘         │ counterpties)│        │  └──────────────┘
 │  (Phase 2)│            └─────────────┘        └──│ Owed ledger  │
 └───────────┘                                      └──────────────┘
```

- **Writers** create transactions through a single data-access function. Manual
  and screenshot writers are interchangeable producers of the same record shape.
- **Readers** are independent queries over the same tables; adding/altering one
  never disturbs another.
- This separation is the "modular foundation" requirement — Phase 2 and future
  features slot in as new writers/readers without schema or UI rewrites.

---

## 4. Data model (Supabase / Postgres)

All money stored as `numeric(12,2)` (exact; no float drift). All tables carry
`user_id uuid` and are protected by Row-Level Security (`user_id = auth.uid()`).

### `categories`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | FK auth.users |
| name | text | e.g. "Food" |
| emoji | text null | quick visual marker |
| color | text null | hex/token for charts & chips |
| applies_to | text | `expense` \| `income` \| `both` (default `both`) |
| sort_order | int | last-used can float client-side |
| is_archived | bool | archive instead of delete (preserves history) |
| created_at | timestamptz | |

### `counterparties` (optional people who owe you)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | |
| name | text | free-text, deduped per user for rollups ("James owes $75") |
| created_at | timestamptz | |

### `transactions` (canonical money event)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | |
| kind | text | `expense` \| `income` |
| amount_total | numeric(12,2) | full amount that moved (the $120 you paid) |
| personal_amount | numeric(12,2) | your true cost; equals `amount_total` unless split (the $30) |
| category_id | uuid null | FK categories |
| occurred_on | date | defaults to today |
| note | text null | |
| source | text | `manual` \| `screenshot` (writer provenance) |
| created_at | timestamptz | |

- **Receivable for a transaction** = `amount_total - personal_amount`.
- A normal (un-split) transaction has `personal_amount = amount_total` → zero receivable.
- **Spending stat** = `sum(personal_amount)` over `kind='expense'`.

### `owed_items` (the split detail — who owes what, settlement state)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | |
| transaction_id | uuid | FK transactions (cascade) |
| counterparty_id | uuid null | FK counterparties (null = "unnamed") |
| amount_owed | numeric(12,2) | this person's share you fronted |
| amount_settled | numeric(12,2) | default 0; supports partial repayment |
| created_at | timestamptz | |

- Invariant maintained by the app: `sum(owed_items.amount_owed) = amount_total - personal_amount`.
- **Outstanding** for an item = `amount_owed - amount_settled`; status derived:
  `0 settled → open`, `partial`, `fully → settled`.
- **Total owed to you** = `sum(amount_owed - amount_settled)` across open items.
- "⚡ Split evenly, N people" is a client convenience that fills
  `personal_amount = amount_total / N` and creates `N-1` owed_items.

> Refunds (later) reuse this engine: a negative-amount expense reverses a category.
> Settlement history (an append-only `settlements` log) is deferred; the
> `amount_settled` field is sufficient for v1.

### Auth
- Supabase Auth, single account (email+password or magic link — pick at build).
- RLS on every table. Multi-user later is a policy/config change, not a rewrite.

---

## 5. Key flows (reference)

### Manual entry (primary, ≤3 taps)
`Tap ➕ → type amount → tap category → Save` → optimistic insert + "Added ✓ / Undo"
toast → Home. Date defaults today; note/date/split optional. Category chips show a
"+" to create-on-the-fly (persists to `categories`).

**Responsive input requirement:** the amount field is driven by an on-screen
numpad on touch devices *and* full hardware-keyboard support on desktop — digits,
`.`, `Backspace`, `Enter`=save, `Tab`/arrows between fields, `Esc`=cancel. One
component, input-method agnostic.

### "I paid for others" (split → receivable)
Expand inside the entry sheet (total already typed): enter **My share**;
**They owe me** auto-computes. Optional free-text names; optional "split evenly
[N]" shortcut. Save writes one `transaction` (`personal_amount` = my share) + one
or more `owed_items`.

### Settle an IOU
Owed-to-me surface lists outstanding items, grouped/rolled-up by counterparty,
showing total outstanding at top. Tap → "Mark paid" or "Partial → $X" updates
`amount_settled`. **No income is created** — settling moves an asset to cash;
spending and net stats are unchanged.

### Home (log + summary + forecast)
- **Net this month** card: `income - spending(personal)`, green if positive.
- **Forecast** (read-side compute, no storage):
  `daily_rate = spend_so_far / days_elapsed`;
  `projected_spend = daily_rate × days_in_month`;
  `projected_net = income_so_far − projected_spend`;
  rendered as a pace bar + "On pace: +$X by <month end>".
- **Owed-to-you** pill (always visible — signature feature isn't buried).
- **Recent** log; split rows badged 👥; tap row → edit/delete.
- Category breakdown (pie/bars) lives one tap deeper to keep Home calm.

### Screenshot import (Phase 2)
Share screenshot → Claude parses rows (amount, merchant, date, guessed category
mapped onto the user's set) → **review queue** of draft cards (low-confidence
flagged ⚠ first) → confirm/fix → saved as `source='screenshot'` transactions,
identical shape to manual.

---

## 6. Tech stack

| Concern | Choice | Why |
|---|---|---|
| UI | React + TypeScript + Vite | fast, modular components |
| Styling | Tailwind CSS | rapid, consistent, themeable design tokens |
| Data/auth | Supabase (Postgres + Auth + RLS) | your pick; gives auth/multi-user nearly free |
| Client data layer | TanStack Query | caching + optimistic add/undo for snappy UX |
| Routing | React Router | Home / Add sheet / More |
| App shell | PWA (vite-plugin-pwa) | "Add to Home Screen", fullscreen, offline *viewing* |
| Layout | single column, max-width ~420–480px, centered | one UI for mobile + desktop; soft tint/gradient sides on desktop |
| Hosting | Vercel or Netlify | trivial deploy of static SPA + Supabase |
| Phase 2 AI | Anthropic API via a secret server function (e.g. Supabase Edge Function) | parse screenshots; key must stay server-side |

> **Phase 2 note / open item:** "using my Claude account" — a public web app can't
> call a Claude.ai *subscription* directly. Screenshot parsing needs the
> **Anthropic API** (an API key billed per use), invoked from a small server-side
> function so the key is never exposed in the browser. Decide billing/key approach
> when we reach Phase 2.

### Non-functional
- Single currency, formatted to locale (default USD).
- **Tabular/monospaced numerals** for all money (columns align — matters a lot).
- Optimistic UI with Undo on create/delete.
- Offline: cached read of last-synced data; writes queue/await connection (basic).

---

## 7. Open design decisions (aesthetic — intentionally deferred)

Not decided here. See the "aesthetic decision menu" accompanying this spec;
these will be settled before UI build using the design skills.

- Visual style/vibe, color system (incl. semantic income/spend/owed colors, light/dark),
  typography & numerals, spacing/density/radius/elevation, iconography,
  motion/transitions, empty states, and chart styling for the breakdown/forecast.

---

## 8. Out of scope (v1)
Bank/account linking; recurring auto-log; NL quick-add; multi-user UI;
true net-worth with balances; multi-currency; settlement audit log.
