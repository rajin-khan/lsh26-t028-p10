# KotoDin implementation handoff

Updated: 2026-08-30

This file is the working context for the next agent. The goal is to harden the existing P10 product without changing its deterministic ledger model or visual identity.

## Current status

Completed in this pass:

1. Empty imported fixtures are rejected before React state changes.
2. Comparison opening balance and low-balance threshold must be non-negative.
3. Comparison low-balance and monthly deposits must be positive.
4. Recharge dates must fall inside the daily-reading window.
5. Target dates before `today` are rejected by the domain function and reset in the UI with a visible notice.
6. The monthly audit table has an accessible scroll region and a narrow-screen cue.
7. The demo shot list now ends at 60 seconds.
8. Regression tests cover the new validator and target-date boundaries.
9. The display, sans, and mono stacks now use broadly available web-safe fallbacks for more consistent rendering across judge machines.

No remaining review finding requires a code change at this point. Do not add font files unless the team chooses a specific permissively licensed font and updates `LICENSES.md`.

## Files changed

- `lib/fixture.ts`: validates non-empty fixture arrays, positive comparison deposits, non-negative comparison balances and thresholds, and in-range recharge dates.
- `lib/ledger.ts`: throws when a target date precedes the case's `today`.
- `components/meter-dashboard.tsx`: preserves the prior valid case after import errors, resets invalid target dates to today, shows the correction message, and labels the scrollable audit table.
- `app/globals.css`: uses broadly available typography fallbacks and styles the target-date notice, table focus state, and mobile scroll cue.
- `tests/tariff.test.ts`: adds four focused regression tests.
- `docs/DEMO.md`: condenses the recording script to a maximum of 60 seconds.

## Verification already run

- `npm test`: 11 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with static `/` and `/_not-found` routes.
- Browser regression at the default desktop viewport: PUB-01 loaded, the target calculator updated, and no console warnings or errors appeared.
- Browser regression at 390px: the scroll cue rendered, the table region exposed `tabindex=0`, and no console warnings or errors appeared.

## Next agent checklist

1. Inspect the diff and confirm there are no unrelated changes.
2. Run `npm test`, `npm run typecheck`, and `npm run build` again.
3. If browser access is available, test one valid JSON import and one invalid JSON import. Confirm an invalid import keeps the previous case visible.
4. Test selecting a different household after changing the target date. Confirm the new case's target date and calculation are shown.
5. Test the target date by keyboard with a date before `today`. Confirm it resets and shows the notice.
6. Test the monthly audit region on a narrow viewport with keyboard focus and horizontal scrolling.
7. Review all visible copy after the changes for plain language and punctuation consistency.
8. Do not add a backend, authentication, chart dependency, forecasting model, or broad redesign.
9. Commit only after the checks pass. Keep each review finding in its own focused commit.

## Product invariants that must not change

- The monthly slab counter resets only at calendar-month boundaries.
- Recharges enter at the start of the date.
- Demand charge and meter rent apply once on the month's first recharge.
- VAT is 5% of energy only.
- Both habit simulations use identical readings and slab counters.
- Recharge timing must never be presented as an energy-rate saving.
- Integer paisa remains the money representation.

## Safe handoff summary

The app was already functionally strong. The implementation work is intentionally narrow: reject bad fixture boundaries, prevent misleading target-date output, make mobile evidence discoverable, shorten the demo script, stabilize typography fallbacks, and lock behavior with tests. No backend, authentication, chart dependency, forecasting model, or broad redesign is warranted by the review.
