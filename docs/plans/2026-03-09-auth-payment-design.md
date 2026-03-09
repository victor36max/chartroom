# Auth & Payment Design

## Context

Chartroom is currently fully open and unauthenticated. All state is client-side and ephemeral. To monetize and control costs, we need user accounts, usage-based billing, and credit top-ups.

**Goal:** Add Google/GitHub login, track per-request LLM costs with markup, give free credits on sign-up, let users top up via Stripe, and gate message sending on auth + positive balance.

## Tech Stack

- **Auth + DB:** Supabase (Postgres + built-in OAuth)
- **Payments:** Stripe (one-time Checkout Sessions for credit top-ups)
- **Session management:** `@supabase/ssr` for Next.js App Router

## Auth Flow

Three Supabase client variants following `@supabase/ssr` pattern:

| Client | File | Used in |
|--------|------|---------|
| Browser | `lib/supabase/client.ts` | Client components |
| Server | `lib/supabase/server.ts` | Route handlers, Server Components |
| Middleware | `lib/supabase/middleware.ts` | `middleware.ts` session refresh |

- **Middleware** (`src/middleware.ts`): Refreshes auth cookie on every request. No blocking/redirecting.
- **OAuth callback** (`app/auth/callback/route.ts`): Exchanges code for session, provisions profile with free credits on first login.
- **Client state**: `AuthProvider` context in `layout.tsx` — exposes `{ user, balance, isLoading, signOut, refreshBalance }`.

Auth triggers:
- Clicking "Sign in" button in header
- Attempting to send a message while unauthenticated (opens login modal instead)

## Database Schema

### `profiles` (extends auth.users)
- `id` (uuid, PK, references auth.users)
- `email`, `display_name`, `avatar_url`
- `balance_usd` (numeric(10,6), default configurable via `FREE_CREDITS_USD` env var)
- `created_at`, `updated_at`

### `usage_logs` (one row per chat request)
- `id`, `user_id`, `model_id`, `tier`
- `input_tokens`, `output_tokens`, `cost_usd`
- `created_at`

### `payments` (Stripe records)
- `id`, `user_id`, `stripe_session_id` (unique)
- `amount_usd`, `status`, `created_at`

**RLS:** Users can only SELECT their own rows. Writes go through `security definer` functions or service role key.

### Atomic balance deduction

Postgres function `deduct_balance(user_id, amount, model_id, tier, input_tokens, output_tokens)`:
- Atomically checks `balance >= amount`, deducts, inserts usage_log
- Raises exception if insufficient balance
- Prevents race conditions on concurrent requests

## Cost Tracking

1. **Pre-check:** Before `streamText()`, verify `balance > 0`. Return 402 if zero.
2. **Stream:** Normal streaming response to client.
3. **Post-stream:** Use `after()` (Next.js) to read `result.usage` → `{ promptTokens, completionTokens }`.
4. **Calculate:** `cost = (input * input_price + output * output_price) / 1M * MARKUP_MULTIPLIER`
5. **Deduct:** Call `deduct_balance()` RPC.

Pricing table in `lib/billing/pricing.ts` — per-model rates from OpenRouter, configurable markup (default 1.5x).

Edge case: User could go slightly negative on concurrent requests. Acceptable at indie scale.

## Stripe Integration

**One-time credit top-ups** via Checkout Sessions (not subscriptions).

- `/api/stripe/checkout` (POST) — Creates Checkout Session with preset amount ($5/$10/$25), returns redirect URL. Metadata includes `user_id` and `amount_usd`.
- `/api/stripe/webhook` (POST) — Handles `checkout.session.completed`. Credits balance, inserts payment record. Idempotent via `stripe_session_id` uniqueness.

## UI Components

### Header (top-right)
- **Logged out:** "Sign in" ghost button
- **Logged in:** Avatar → account dropdown

### Login Modal (`components/auth/login-modal.tsx`)
- shadcn Dialog with "Continue with Google" / "Continue with GitHub" buttons
- Calls `supabase.auth.signInWithOAuth()`

### Account Dropdown (`components/auth/account-dropdown.tsx`)
- User name/email
- Balance: "$X.XX" with top-up button
- Usage summary (recent usage_logs)
- Sign out

### Top-up Dialog (`components/auth/topup-dialog.tsx`)
- 3 preset buttons: $5, $10, $25
- Calls `/api/stripe/checkout`, redirects to Stripe

### Message Input Gating
- Not logged in → submit opens login modal
- Balance $0 → shows "Add credits" prompt, input disabled
- Balance > 0 → normal send

## API Routes (new)

| Route | Method | Purpose |
|-------|--------|---------|
| `/auth/callback` | GET | OAuth code exchange |
| `/api/user/balance` | GET | Return user's current balance |
| `/api/stripe/checkout` | POST | Create Stripe Checkout Session |
| `/api/stripe/webhook` | POST | Handle Stripe payment events |

## Modified Files

| File | Changes |
|------|---------|
| `app/layout.tsx` | Wrap with AuthProvider |
| `app/page.tsx` | Add auth UI to header |
| `app/api/chat/route.ts` | Auth check (401), balance check (402), cost tracking via `after()` |
| `components/chat/chat-panel.tsx` | Gate sends on auth + balance |
| `package.json` | Add `@supabase/supabase-js`, `@supabase/ssr`, `stripe` |

## New Files

```
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/middleware.ts
lib/billing/pricing.ts
app/auth/callback/route.ts
app/api/user/balance/route.ts
app/api/stripe/checkout/route.ts
app/api/stripe/webhook/route.ts
components/auth/auth-provider.tsx
components/auth/login-modal.tsx
components/auth/account-dropdown.tsx
components/auth/topup-dialog.tsx
middleware.ts
```

## Env Vars (new)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FREE_CREDITS_USD=1.00
MARKUP_MULTIPLIER=1.5
```

## Implementation Phases

1. **Auth** — Supabase setup, middleware, OAuth callback, AuthProvider, login UI, gate `/api/chat`
2. **Balance & Cost Tracking** — DB tables, pricing logic, `after()` cost deduction, balance endpoint, UI gating
3. **Stripe Payments** — Checkout + webhook routes, top-up dialog, balance crediting
4. **Polish** — Free credits on sign-up, usage display, error states, toast notifications

## Verification

- Sign in with Google → profile created with free credits
- Sign in with GitHub → same flow
- Send message → tokens tracked, balance deducted
- Balance hits $0 → message blocked with "Add credits" prompt
- Top up $5 → Stripe checkout → webhook credits balance → can send again
- Multiple rapid requests → balance stays consistent (atomic deduction)
- Sign out → "Sign in" button returns, messages blocked
