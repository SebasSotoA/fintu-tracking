# Fintu

A portfolio tracker that tells you if you are making or losing money after fees and FX.

This is the product memo: why Fintu exists, what a user can do today, and where the product is going. How the repo is wired lives elsewhere.

---

## The problem

Fintu was built for the founder first.

He invests in the US market — stocks, ETFs, and crypto — through a local broker, but he deposits in Colombian pesos. The broker converts that money to USD at its own rate and charges fees along the way.

Generic portfolio tools ignore that path. They show a ticker, today’s price, and maybe today’s USD/COP from the news. They never see the conversion the broker actually used or the fees it actually took, so “am I up or down?” is guesswork. You can look rich in dollars and still have lost purchasing power in pesos, or the reverse, and not know which.

Fintu’s job is a simple, deterministic answer: after fees and the broker’s conversion, is this money making or losing?

Today only the US market is in scope. Other markets come later. Entry is still manual — you record what happened; Fintu does not pull it from the broker.

```mermaid
flowchart LR
  cop["COP deposit"] --> broker["Local broker FX + fees"]
  broker --> usd["USD to invest"]
  usd --> us["US stocks / ETFs / crypto"]
  us --> q["Making or losing?"]
```

---

## Value proposition

What a user gets:

- True performance of US holdings when the money started as pesos
- Fees that are not hidden — they sit in cost and in cash, not in a footnote
- FX at the rate that actually applied on the day, not today’s news rate
- One place for deposits, trades, and “am I winning?”

Fintu is not a broker. It is not a trading app. You already trade elsewhere. Fintu is the ledger that tells the truth.

“True” here means money-weighted return: what you actually earned on the cash you put in, after the costs of getting that cash into the market. The book is in USD. Local currency (COP first) is the funding path, not a second portfolio you have to reconcile by hand.

---

## Who it’s for

LATAM retail investors who fund a US brokerage from local currency. Colombia and Hapi are the beachhead.

It is also useful to anyone who wants honest returns after costs: the same fees-and-FX problem shows up whenever a broker sits between your pesos (or other local cash) and a US account.

Mexico is modeled so the product is not Colombia-only in principle. You can pick a country and a broker, including other local names besides Hapi. Go-to-market stays Colombia first until that beachhead is real.

---

## What you can do today

Sign in, pick a country and a broker, and keep an honest book of a US portfolio funded in local currency.

- **Dashboard** — net worth, holdings, recent activity. This is the “how am I doing?” screen. Prices update when you click Refresh; they do not yet refresh on their own.
- **Trades** — record buys and sells of US stocks, ETFs, and crypto. Average cost is the holding method today.
- **Cash** — deposits, withdrawals, and fees, plus the FX rates that actually applied when money moved.
- **Performance** — money-weighted return, fee impact, FX impact, and a comparison vs SPY, so you can see whether the book beat a simple US market proxy after costs.

The daily loop is: record cash when you fund or withdraw, record trades when you buy or sell, keep the FX that the broker used, then read the dashboard and performance. Nothing executes a trade. Fintu only accounts for what already happened.

The product is in closed beta. Paid billing is not live; nobody is charged yet. Plans exist as a shape of the product — what Pro might include later — not as a checkout.

The marketing site is separate from the app. The app is the tracker. The site is how people find it.

---

## Roadmap

Launch is not “add payments.” Launch is “people can use it.” Paid plans come after a small beta proves the value.

1. **Get the product online** so people can use it. The app works on a local machine; it is not yet a live product on the internet.
2. **Keep prices fresh automatically.** Today you click Refresh. After the product is online, quotes (including SPY) should update after the US close without a click. Stale prices make “am I winning?” a lie.
3. **Invite a small Colombia / Hapi beta** — on the order of 20–50 people who already live this path. They are the test of whether the ledger is worth opening every week.
4. **Paid plans** once that beta shows the value. In Colombia that means Wompi. Not before going live, and not before the beta has a reason to exist.
5. **Exports** — PDF is promised on Pro and is not built yet. Colombian tax forms come later; they are not the reason to launch.

```mermaid
flowchart LR
  live["Get it online"] --> prices["Automatic prices"]
  prices --> beta["Colombia / Hapi beta"]
  beta --> paid["Paid plans"]
  paid --> exports["Exports"]
```

### Later / not now

- **Auto-import from brokers.** Hapi has no CSV export, so a Hapi importer is cancelled for now. Broader auto-ingest (statements, notifications, screenshots) is a later product, not a launch item.
- **More markets than the US.** The money path is US assets funded locally. Other markets wait.
- **FIFO, multi-broker-as-accounts, Chile.** Average cost and one book per user are enough for the beachhead. Chile and a true multi-account model wait until Colombia / Hapi ships.

Do not reverse these on the way to launch: keep marketing off the app, do not rebuild the cancelled Hapi importer, and do not put checkout in front of a live product and a real beta.

---

## How we got here

This started as a personal tool: track a Hapi account honestly, including the conversion and the fees the broker actually charged.

The idea did not change. The product grew around it. Fees and FX were first-class from the start — because that was the whole point. Then a dashboard and a performance view so “am I winning?” had a home. Then onboarding, broker choice, and a path to charge later, once the book was something other people might use.

Recent work is making it launchable — online, with fresh prices, then a small beta — not inventing a new thesis.

---

## Where to read more

- **docs/TODO.md** — launch checklist (what is still blocking a live product).
- **docs/deploy.md** — how the live product gets onto the internet.
- **CLAUDE.md** — how this repo is built and how agents should work in it.
