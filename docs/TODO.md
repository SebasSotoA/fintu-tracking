# Fintu — Launch To-Do List

> Persistent task list for the Fintu initial version / launch.
> Last updated: 2026-08-19

## 🧾 Billing — Wompi recurring payments (in progress)

Wompi **does** support monthly/recurring billing via **Payment Sources (tokenization)**.
No built-in subscription scheduler — Fintu owns the billing engine.

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

## 🚀 Launch blockers

- [ ] **Actually deploy** — workflows exist but never ran (last commit 2026-07-05)
  - AWS OIDC roles + 8 repo secrets + DNS (`app.sandbox.fintu.com`, `api.sandbox.fintu.com`) unverified
- [ ] **Scheduled price refresh** — prices only update on manual "Refresh prices" click
  - Add daily cron (after US market close) so dashboard + SPY benchmark stay current
- [ ] **Housekeeping** — `bin/` is untracked (git status shows `?? bin/`)

## 🔮 Roadmap (build later)

- [ ] **Auto-ingest investments** — parse broker notifications (regex/NLP) and/or screenshots (OCR via AWS Textract)
  - Design: LLM generic extractor first (confirm-before-commit), then per-broker templates
  - Broker model already supports BrokerID + fees
