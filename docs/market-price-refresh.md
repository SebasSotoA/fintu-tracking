# Market price refresh

Holdings and performance use rows in `market_prices`. Refresh them periodically so dashboard values stay current.

## Manual refresh (UI)

On the dashboard, use **Refresh prices** on the holdings table. This calls:

`POST /api/market-prices/refresh`

with the user JWT.

## Scheduled refresh (optional)

Run the same endpoint on a schedule (e.g. daily after US market close):

1. Obtain a valid user or service token with API access.
2. `curl -X POST "$API_URL/api/market-prices/refresh" -H "Authorization: Bearer $TOKEN"`

Ensure **SPY** is included in the refreshed tickers so the performance chart benchmark line can render.

## Local development

With `make dev`, trigger refresh from the dashboard or call the API directly against `http://localhost:8080`.
