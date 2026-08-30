# KotoDin

KotoDin shows how daily electricity use and recharges change a prepaid meter's balance. It estimates when the money will run out, calculates a top-up for a chosen date, and compares recharge habits under the published P10 tariff.

- Team: GROCERYBOIX, `LSH26-T028`
- Problem: `P10`, Prepaid Meter Recharge Advisor
- Repository: [rajin-khan/lsh26-t028-p10](https://github.com/rajin-khan/lsh26-t028-p10)
- Live URL: pending public Vercel deployment
- Demo video: not recorded. Optional, no longer than three minutes.
- Event start code: `LSH26-8490-C900`
- Public fixture: release 2.2, SHA-256 `13e7dd3d0ad55429bdce1db4c70175bb6f6c60a197826b9a8e87d3da210e4c4e`

## Run locally

Use Node.js 22.18 or newer and pnpm 10.28.2. Dependency versions are pinned. No environment variables, database, account, API key or paid service is needed.

```bash
git clone https://github.com/rajin-khan/lsh26-t028-p10.git
cd lsh26-t028-p10
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

Run the automated checks:

```bash
pnpm check
```

This runs the domain tests, TypeScript checking and production build. To serve that build locally, run `pnpm start` after stopping the development server.

## Quick browser check

The names below use the English interface. The same controls are available in Bangla.

1. Start on PUB-01. Check that the page shows six months, 181 readings, a light January, a heavy May and the late-May recharge.
2. Use the day slider in "The daily money trail". The selected date, balance, units and recharge should change together. On a narrow screen, scroll the chart and monthly table sideways to read them.
3. Change the target date in "How much should we recharge?". The top-up and its breakdown should update. A date before the case's `today` should not be accepted.
4. In "Compare recharge timing", PUB-01 should show equal consumed cost. Select PUB-02 to see a difference caused by fixed charges. Energy-cost difference should remain zero.
5. Use "Load judge JSON" to open `data/P10_prepaid_meter_public.json` or a same-shape judge fixture. "Restore samples" or a page reload should return to the published cases.
6. Switch between English and বাংলা. Check the labels, dates, amounts and layout, including the chart at phone width.

## Problem-solving approach

The P10 rules describe a daily ledger, so the team separated the calculation from the interface. Each day has an opening balance, any recharge, energy charges, VAT, fixed charges and a closing balance. Money uses integer paisa.

One tariff function handles history, forecasts and both recharge policies. Identical usage and monthly slab counts must produce identical energy charges. Tests cover slab boundaries, first-recharge charges, malformed fixtures and recommendation totals. The browser checklist above covers the visible workflow.

## Requirement evidence

### R1, household and history

Complete. The app starts with all 25 official cases from `data/P10_prepaid_meter_public.json` and validates imported same-shape JSON with `lib/fixture.ts`. PUB-01 has six complete calendar months, 181 consecutive daily readings, 18 recharges, a light January at 129 units, a heavy May at 673 units, and a ৳4,300 recharge on 26 May. The four signal blocks make those facts visible without requiring a judge to inspect raw JSON.

Use the household selector to move among public cases. Use "Load judge JSON" for the published fixture, one case object, or an unpublished fixture with a `cases` array. Invalid dates, gaps, non-whole units, money fields, duplicate case IDs, repeated comparison months or incorrect problem IDs produce a visible error. Validation messages follow the selected language without changing technical field names. A failed import leaves the current data in place. "Restore samples" returns to the public cases.

### R2, daily balance reconstruction

Complete. `lib/tariff.ts` prices units progressively across 75/76, 200/201, 300/301, 400/401, and 600/601 boundaries. `lib/ledger.ts` processes each date in this order:

1. Reset the slab counter when the calendar month changes.
2. Add any start-of-day recharge.
3. On that month's first actual recharge, deduct ৳42 demand charge and ৳40 meter rent once.
4. Split the day's units across the progressive slab boundaries.
5. Add 5% VAT to energy only, rounded to the nearest paisa.
6. Deduct energy and VAT and record the closing balance.

"The daily money trail" shows the closing balance as an SVG line and marks every recharge date. A keyboard-accessible day slider exposes the daily values. The monthly table separates deposits, energy, VAT, fixed charges and closing balance. Both the chart and table scroll on narrow screens so their labels stay readable. A reconstructed balance may go negative; the ledger keeps the shortfall visible.

### R3, run-out and target-date advice

Complete. If the rebuilt balance is already zero or below, `forecastRunOut` returns the case's `today`. Otherwise it starts the next day, carries the current month's running units forward, resets units on later month boundaries, and returns the first date whose closing balance is zero or negative at `usual_daily_units`.

`calculateTargetRecharge` projects through the chosen target date inclusively. The visible equation is:

```text
base energy + higher-slab uplift + applicable fixed charges + energy VAT
− current rebuilt balance
= recharge needed today, floored at zero
```

The calculator reuses the ledger's current month counter and charges the monthly ৳82 only if a positive top-up would be that month's first recharge.

### R4, recharge-habit comparison

Complete. `compareRechargeHabits` takes the case's exact three named months and identical daily usage for both simulations. Both start from `comparison.opening_balance_bdt`.

- Low-balance policy deposits `low_amount_bdt` at the start of a day whose opening balance is below `low_threshold_bdt`.
- Monthly policy deposits `monthly_amount_bdt` on the first day of each month.

The displayed cost is money consumed, energy plus VAT plus applicable first-recharge fixed charges. Deposit totals and closing balances are shown separately. The UI includes an energy-cost invariant, and the test suite proves zero energy-cost difference on all 25 public cases. PUB-01 correctly returns equal cost. PUB-02, PUB-06 and PUB-24 differ by exactly ৳82 because low-balance top-ups skip one month's first-recharge fixed charges.

## Technical decisions

- Pure TypeScript domain functions and integer paisa keep money deterministic and testable.
- One tariff function handles the ledger, both forecasts and both habit policies. This prevents calculation drift.
- All calculations run in the browser without a backend or external API.
- An SVG chart shows every recharge marker without a charting dependency.
- English and Bangla controls, dates and amounts use the same calculation results. Switching language does not change the data.
- Native select, date, file and range controls provide keyboard access. The interface also has visible focus, a skip link, scrollable charts and tables, and reduced-motion support.

The app uses Next.js, React and TypeScript. It has no backend or database. Vercel deployment is planned but has not been completed in this record.

The project vocabulary is in [CONTEXT.md](CONTEXT.md). The calculation design is recorded in [the architecture decision](docs/adr/0001-local-deterministic-ledger.md).

## Tests

`tests/tariff.test.ts` checks:

- all 25 public fixtures validate;
- empty fixtures, invalid comparison amounts and recharges outside the reading window are rejected;
- every published slab boundary splits correctly;
- 601 units traverse all six slabs;
- monthly demand charge and meter rent apply once on the first recharge;
- PUB-01 reconstructs all 181 days and produces a run-out date;
- target-date parts reconcile to the recommended top-up;
- a target date before `today` is rejected;
- every public habit comparison has identical energy cost and any total difference equals fixed-charge difference.

`tests/fixture-validation.test.ts` checks duplicate IDs and comparison months, precise money parsing, unsafe amounts, translated import errors, and a comparison whose fixed-charge difference spans all three months.

`tests/presentation.test.ts` checks English/Bangla digits, money and date formatting, matching translation keys, and variable fixed-charge explanations.

## Known limitations

- Imported fixtures stay in the open page. Reloading restores the published samples. There is no account or shared storage.
- Future consumption uses the problem's constant `usual_daily_units`, not a prediction of changing household use.
- The run-out search stops after ten years. A result beyond that range is not a promise of unlimited balance.
- The app supports seeded cases and JSON file upload, not manual row-by-row reading entry.

## Team contributions

| Registered member | GitHub username | Major contribution | Evidence |
| --- | --- | --- | --- |
| Adib Ar Rahman Khan | [rajin-khan](https://github.com/rajin-khan) | Led problem breakdown and tariff review, coordinated AI-assisted work, integrated the core ledger, forecasts, comparison and interface, and set up verification. | Commit `e57cbaecf3f074ab20fc397caf0e94ce4cdc7561`; `lib/ledger.ts`, `lib/tariff.ts`, `components/meter-dashboard.tsx`, `tests/tariff.test.ts` |
| Saumik Saha Kabbya | [Kabbya04](https://github.com/Kabbya04) | Created the registered repository and shared team access while the lead was unavailable. | Original repository ownership and the team's 30 August Discord repository-creation thread, described in `EVENT.md` |
| Samiyeel Alim Binaaf | [Pronaaf2k](https://github.com/Pronaaf2k) | Hardened fixture imports and target-date handling, added regression tests and the monthly-table scroll cue, and improved system-font fallbacks. | Commits `92d4c48c7bb8e652fd30d16ac24131919b998897` and `22c38b22f717917a2749fa4dd9ac2667beeac0bd`; `lib/fixture.ts`, `lib/ledger.ts`, `tests/tariff.test.ts`, `app/globals.css` |

Adib also uses the name Rajin Khan, which appears in Git history. Commit count alone does not describe each member's work.

## AI assistance and records

OpenAI Codex assisted with rule research, prior-project review, domain modeling, implementation, interface design, tests, documentation and browser review under the team lead's direction. The team is responsible for the submitted result. Use `pnpm check` and the browser checklist above to verify this version.

Pre-event material is declared in [EVENT.md](EVENT.md) and [evaluation-manifest.json](evaluation-manifest.json). Third-party material is listed in [LICENSES.md](LICENSES.md). The optional recording script is in [docs/DEMO.md](docs/DEMO.md).

## Before submission

Deployment is still pending. After deploying, replace the live URL above and `live_url` in the manifest with the public address. If a demo is recorded, add its link to both files.

Open the repository and live app in a signed-out window. Confirm that the deployed application matches the exact 40-character commit SHA entered in the leader's Final Submission Form. Freeze the source by the 10:00 PM Asia/Dhaka build cutoff on 30 August 2026. The conflicting form-deadline instructions are recorded in [HACKATHON_CONTEXT.md](HACKATHON_CONTEXT.md). Keep the repository public and the app live until results are announced.
