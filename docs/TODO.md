# Fintu — Launch To-Do List

> Persistent task list for the Fintu initial version / launch.
> Last updated: 2026-09-06
>
> Sequence (do not invert): **online → automatic prices → Colombia/Hapi beta → would you pay? → Wompi / multi-currency / mobile.**
> Product memo: `FINTU.md`. Deploy: `docs/deploy.md`.

## 🚀 Launch blockers (Track A — now)

- [ ] **Actually deploy** — workflows exist but have not been proven live
  - AWS OIDC roles + repo secrets + DNS (`app.sandbox.fintu.com`, `api.sandbox.fintu.com`)
  - Supabase Auth Site URL + redirect URLs for the sandbox host
- [ ] **Scheduled price refresh** — prices only update on manual "Refresh prices" click
  - Daily job after US market close so dashboard + SPY stay current
- [ ] **Invite 20–50 Colombia / Hapi beta users** — closed_beta plan already auto-assigned; ask if they open the ledger after deposits
- [ ] **Housekeeping** — `bin/` is untracked (git status shows `?? bin/`)

## 📣 Marketing (Track C — with the beta)

The Astro site in `marketing/` is a landing page, not a GTM motion.

- [ ] **Spanish + English** on the marketing site; product question stays on tour/dashboard, not as the login pull-quote
- [ ] **Auth testimonial (oversight)** — login/sign-up left panel (`AuthValuePanel`) should read as a first-person testimonial + attribution, not “After fees and FX, are you making or losing?” in a giant quote mark. Placeholder founder/beta line until a real name exists. EN + ES.
- [ ] **Waitlist / invite capture** on fintu.com → drip into closed beta (no public self-serve until support exists)
- [ ] **Distribution** — Hapi/Colombia investor chats, founder story (pesos in, broker FX + fees); paid ads only after the app is live and sticky
- [ ] **Pricing page** — after Free vs Pro gates are locked (Track D), not before
- [ ] **Broker landings later** — e.g. Hapi fees + FX; Mexico only after profile-driven FX (Track B)

## 🧾 Billing — plans + Wompi (Track D — after the beta)

Scaffolding exists: `plans` / `subscriptions` tables, plan picker, `NoOpBillingProvider`, every invited user on `closed_beta`.

Seeded shape (do not silently change without a product decision):

| Plan | Price | Intended gate |
|------|-------|----------------|
| closed_beta | $0 | Unlimited, invite-only (`is_public: false`) |
| free | $0 | 50 trades, 1 broker, no exports |
| pro_monthly | $4.99/mo | Unlimited + CSV/PDF |
| pro_annual | $39.99/yr | Same as Pro |

Wompi **does** support recurring billing via **Payment Sources (tokenization)**.
No built-in subscription scheduler — Fintu owns the billing engine.

- [ ] **Lock feature gates** — enforce `max_trades` / exports in the API before charging; ship PDF/CSV or drop it from Pro `features`
- [ ] **Implement `WompiBillingProvider`** — replace `NoOpBillingProvider` in `backend/internal/services/billing_provider.go`
  - Tokenize card once (Wompi stores it, returns payment source token — never store card data)
  - Store payment source token per user
  - Charge on renewal via `POST /v1/transactions` referencing the saved source
- [ ] **Renewal cron** — daily job that finds subscriptions due for renewal and charges the saved payment source
- [ ] **Webhook handler** — reconcile Wompi transaction events (APPROVED / DECLINED) and update subscription status
- [ ] **Retry / dunning logic** — handle declined cards (Wompi `reintento-de-pago` for user retry)
- [ ] **Wompi account setup** — Agregador plan (2.65% + $700 COP per successful transaction, + IVA), 100% online activation
  - Need: Bancolombia savings/checking account or Nequi + RUT (PDF from DIAN)
  - Sandbox keys for dev, production keys for launch
- [ ] **COP collection via Wompi** vs USD list prices — decide before checkout; MercadoPago/Stripe stay for later countries

## 🌍 Broker / currency agnostic (Track B — after beachhead)

Presets already include Hapi, Trii, GBM (MXN), XTB, eToro, Manual. Runtime FX and copy are still COP.

- [ ] Drive `localCurrency`, cash-flow codes, and FX pair from the user’s `broker_preset_id` (Mexico/MXN first)
- [ ] Generalize Twelve Data current-rate + chart cache key to that pair (not always USD/COP)
- [ ] Replace COP-hardcoded i18n with `{local}` interpolation
- [ ] Brokers as data — new country/fee row, not a new app; “Other / Manual” for unknown brokers

## 📱 Mobile (Track E — after weekly web use)

No native app in this repo. Phone users should use the web app first.

- [ ] **Mobile web quality** — dashboard, add cash/trade, tour on a phone
- [ ] **PWA** — manifest, icons, add-to-home-screen
- [ ] **Native later** — Capacitor or Flutter on the same Go API; no duplicated ledger logic
- [ ] Push (“prices updated”) only after scheduled price refresh exists

## 🔮 Later (do not pull into launch)

- [ ] **Auto-ingest investments** — parse broker notifications (regex/NLP) and/or screenshots (OCR via AWS Textract)
  - Design: LLM generic extractor first (confirm-before-commit), then per-broker templates
  - Broker model already supports BrokerID + fees
- [ ] Colombian tax forms, FIFO, multi-broker-as-accounts, non-US markets
