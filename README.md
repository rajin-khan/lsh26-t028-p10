# KotoDin

KotoDin answers the prepaid-meter question a family actually asks: "How many days do we have, and how much should we recharge?" It reconstructs every taka in a supplied household case, forecasts the first zero-or-negative balance date, calculates a target-date top-up, and compares two recharge habits without pretending recharge timing changes the tariff.

- Team: GROCERYBOIX, `LSH26-T028`
- Problem: `P10`, Prepaid Meter Recharge Advisor
- Repository: `https://github.com/Kabbya04/lsh26-t028-p10`
- Live URL: pending public Vercel deployment
- Event start code: `LSH26-8490-C900`
- Public fixture: release 2.1, SHA-256 `6bac497566d848b8de46df17cad7e15347393805df6fca7c2694dab80b827c7f`

## Run it

Requirements: Node.js 22 or newer and pnpm 10. The repository pins already-verified dependency versions and does not need environment variables, accounts, Supabase, or secrets.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`.

For the same checks used before submission:

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Requirement evidence

### R1, household and history

Complete. The app starts with all 25 official cases from `data/P10_prepaid_meter_public.json` and validates imported same-shape JSON with `lib/fixture.ts`. PUB-01 has six complete calendar months, 181 consecutive daily readings, 18 recharges, a light January at 129 units, a heavy May at 673 units, and a ৳4,300 recharge on 26 May. The four signal blocks make those facts visible without requiring a judge to inspect raw JSON.

Use the household selector to move among public cases. Use **Load judge JSON** for the published fixture, one case object, or an unpublished fixture with a `cases` array. Invalid dates, gaps, non-whole units, money fields, comparison months, or problem IDs produce a visible error. **Restore samples** returns to the public cases.

### R2, daily balance reconstruction

Complete. `lib/tariff.ts` prices units progressively across 75/76, 200/201, 300/301, 400/401, and 600/601 boundaries. `lib/ledger.ts` processes each date in this order:

1. Reset the slab counter when the calendar month changes.
2. Add any start-of-day recharge.
3. On that month's first actual recharge, deduct ৳42 demand charge and ৳40 meter rent once.
4. Split the day's units across the progressive slab boundaries.
5. Add 5% VAT to energy only, rounded to the nearest paisa.
6. Deduct energy and VAT and record the closing balance.

The **Daily money trail** renders the closing balance as a custom SVG line, places a marker on all recharge dates, provides a keyboard-accessible day scrubber, and shows a monthly deposit, energy, VAT, fixed-charge and closing-balance audit table. A reconstructed balance may go negative; the ledger keeps the evidence instead of clipping it.

### R3, run-out and target-date advice

Complete. `forecastRunOut` starts after the case's `today`, carries the current month's running units forward, resets units on later month boundaries, and returns the first date whose closing balance is zero or negative at `usual_daily_units`.

`calculateTargetRecharge` projects through the chosen target date inclusively. The visible equation is:

```text
base energy + higher-slab uplift + applicable fixed charges + energy VAT
− current rebuilt balance
= recharge needed today, floored at zero
```

The calculator reuses the ledger's current month counter and charges the monthly ৳82 only if a positive top-up would be that month's first recharge.

### R4, recharge-habit comparison

Complete. `compareRechargeHabits` takes the case's exact three named months and identical readings for both simulations. Both start from `comparison.opening_balance_bdt`.

- Low-balance policy deposits `low_amount_bdt` at the start of a day whose opening balance is below `low_threshold_bdt`.
- Monthly policy deposits `monthly_amount_bdt` on the first day of each month.

The displayed cost is money consumed, energy plus VAT plus applicable first-recharge fixed charges. Deposit totals and closing balances are shown separately. The UI includes an energy-cost invariant, and the test suite proves zero energy-cost difference on all 25 public cases. PUB-01 correctly returns equal cost. PUB-02, PUB-06 and PUB-24 differ by exactly ৳82 because low-balance top-ups skip one month's first-recharge fixed charges.

## Technical decisions

- Pure TypeScript domain functions and integer paisa keep money deterministic and testable.
- One tariff primitive serves the ledger, both forecasts and both habit policies. This prevents calculation drift.
- Local fixture state avoids backend, authentication, network and production-database failure modes during judging.
- A custom SVG chart avoids a large chart dependency and exposes every recharge marker.
- The interface uses native select, date, file and range controls, visible focus, a skip link, narrow-screen layouts and reduced-motion support.

The project vocabulary is in `CONTEXT.md`. The local deterministic architecture decision is recorded in `docs/adr/0001-local-deterministic-ledger.md`.

## Tests

`tests/tariff.test.ts` checks:

- all 25 public fixtures validate;
- every published slab boundary splits correctly;
- 601 units traverse all six slabs;
- monthly demand charge and meter rent apply once on the first recharge;
- PUB-01 reconstructs all 181 days and produces a run-out date;
- target-date parts reconcile to the recommended top-up;
- every public habit comparison has identical energy cost and any total difference equals fixed-charge difference.

## Known limitations

- Imported fixtures stay in the current browser session. There is no account or shared persistence.
- Future consumption uses the problem's supplied constant `usual_daily_units`; no probabilistic or ML forecast is claimed.
- The app supports seeded cases and JSON file upload, not manual row-by-row reading entry.

## Team and disclosure

- Adib Ar Rahman Khan, also known as Rajin Khan, [`rajin-khan`](https://github.com/rajin-khan): team lead, decomposition, product direction, rules and tariff review, AI-agent coordination, verification, deployment and submission.
- Saumik Saha Kabbya, [`Kabbya04`](https://github.com/Kabbya04): contribution record to be confirmed before the judged commit.
- Samiyeel Alim Binaaf, [`Pronaaf2k`](https://github.com/Pronaaf2k): contribution record to be confirmed before the judged commit.

OpenAI Codex assisted with official-rule research, prior-project audits, domain modeling, implementation, interface design, tests, documentation and browser QA. The team directed the work and verified it with the checks above. Pre-event material and provenance are declared in `EVENT.md` and `evaluation-manifest.json`. Every third-party item is listed in `LICENSES.md`.

The optional recording script is in `docs/DEMO.md`.
