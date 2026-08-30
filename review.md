# KotoDin project review

Date: 2026-08-30

## Verdict

The project is in good shape. The tariff engine is small, deterministic, and easy to audit. The seven automated tests pass, TypeScript passes, the production build passes, and the main desktop and narrow-screen flows render cleanly. The visual system is distinctive and purposeful. I would not redesign the page before fixing the edge cases below.

The findings are numbered so they can be approved one at a time. P0 means a judge can break the app or a required submission artifact is plainly non-compliant. P1 means a realistic input can produce a wrong or confusing result. P2 means the product remains usable but loses clarity, polish, or test confidence.

## Findings

### 1. P0: an empty imported fixture can crash the dashboard

Evidence: `parseFixtureJson` accepts `{ "problem_id": "P10", "cases": [] }` because it maps the array without requiring at least one case (`lib/fixture.ts:78-81`). The import handler then calls `imported[0].case_id` after setting the app state to the empty array (`components/meter-dashboard.tsx:87-94`). The next render has no `household`, so the calculation memo calls `reconstructLedger(undefined)` (`components/meter-dashboard.tsx:64-75`).

Impact: a malformed or accidentally empty judge fixture can take down the client instead of showing the existing inline import error. This is the most important robustness gap because fixture upload is a visible product feature.

Recommendation: reject an empty `cases` array before state changes, or make the handler validate the array and only call `setCases` after all checks pass. Keep the current error banner and preserve the prior valid case set.

Acceptance check: loading an empty cases array leaves the previous dashboard visible, shows a readable error, and produces no uncaught browser error.

### 2. P1: imported comparison amounts and thresholds accept negative values

Evidence: `bdtToPaisa` correctly parses signed money (`lib/money.ts:1-10`), but fixture validation only checks that comparison fields are strings and parseable (`lib/fixture.ts:58-66`). A negative low-balance amount, monthly amount, or threshold can therefore reach `compareRechargeHabits` (`lib/ledger.ts:239-247`) and produce negative deposits or an inverted policy.

Impact: the app can display a result that does not describe a real recharge habit. Published fixtures are trusted, but the UI explicitly invites judge JSON, so validation should protect the calculation boundary.

Recommendation: enforce non-negative opening balance and threshold, and strictly positive low-balance and monthly deposit amounts. If negative opening balances are intentionally supported as reconstructed history, keep that allowance only on the main case field and document it.

Acceptance check: invalid comparison money is rejected with a field-specific message and the prior valid dashboard remains loaded.

### 3. P1: recharges outside the reading window are silently ignored

Evidence: validation checks recharge dates and amounts but never checks that a recharge date falls within the daily-reading range (`lib/fixture.ts:33-43`). Reconstruction indexes recharges by date and only consumes entries while iterating readings (`lib/ledger.ts:13-37`). An out-of-range recharge disappears from the displayed history and totals without an error.

Impact: a fixture can claim recharge history that the ledger does not account for. That undermines the app's strongest promise, that every taka is traceable.

Recommendation: reject recharges before the first reading or after the final reading, unless the product explicitly wants to model deposits outside the supplied history. Also consider rejecting duplicate recharge records only if the fixture contract says duplicates are invalid. Same-date recharges can remain supported because the ledger intentionally aggregates them.

Acceptance check: an out-of-range recharge produces an import error naming the date; no silent loss occurs.

### 4. P1: a typed target date before today produces a misleading zero-day answer

Evidence: the date input has an HTML `min` attribute, but the controlled handler accepts any typed value (`components/meter-dashboard.tsx:263-270`). `daysBetween` returns an empty list when the end is not after the start (`lib/date.ts:28-35`), so the UI can show `Recharge today ৳0.00` and `Funds 0 units across 0 days` for a date before today.

Impact: keyboard entry and programmatic browser input can bypass the picker constraint. The result reads like a valid recommendation even though the requested date is impossible.

Recommendation: clamp the value to today or show an inline validation message and disable the calculation until the date is at least today. Keep the input's `min` attribute as a first line of defense.

Acceptance check: entering a date before today never displays a valid-looking zero-day recommendation; the user sees a clear correction or the value resets to today.

### 5. P2: the mobile audit table hides most of its evidence without a scroll cue

Evidence: the audit table deliberately has `min-width: 830px` inside `.table-scroll` (`app/globals.css:831-838`) and the 390px render shows only the first few columns until the user discovers horizontal scrolling.

Impact: the VAT, fixed-charge, and closing-balance columns are central proof for P10 but are easy to miss on a phone-sized judge viewport.

Recommendation: add a short visible cue such as `Swipe to see VAT, fixed, and closing`, make the first column sticky, or provide a compact stacked mobile summary while retaining the full table on larger screens.

Acceptance check: at 390px, a first-time user can tell immediately that the table scrolls and can reach every value without guessing.

### 6. P1: the supplied demo script exceeds the strictest stated video limit

Evidence: `docs/DEMO.md` says the script takes about 75 seconds and its final step ends at 1:15 (`docs/DEMO.md:3-10`). The attached submission guide says each demo video must be no more than 60 seconds. The orientation page currently says a demo is optional and may be up to three minutes, so the supplied materials conflict.

Impact: using the current script verbatim risks violating the stricter written requirement, even though the product itself is ready to demonstrate.

Recommendation: rewrite the shot list to fit 55 to 60 seconds, preserving the four MVP proof points and removing the extra case-switch narration. Treat 60 seconds as the safe limit until the event's final submission form states otherwise.

Acceptance check: the script's timestamps end at 0:60 or earlier and a practice recording demonstrates R1 through R4 without relying on narration to explain missing UI evidence.

### 7. P2: regression coverage is strong for the ledger but thin at the UI and validation boundary

Evidence: `tests/tariff.test.ts` contains seven tests covering tariff boundaries, PUB-01 reconstruction, target reconciliation, and the energy-cost invariant. There are no tests for empty fixture arrays, invalid comparison values, out-of-range recharges, pre-today target dates, or the file-import state transition.

Impact: the exact failures in findings 1 through 4 could return during a rushed fix without a fast automated signal.

Recommendation: add focused domain tests for each validator edge case and one browser or component test for a failed import that preserves the prior state. Keep the existing small test suite; it is a good foundation and does not need a broad testing framework unless the team already uses one.

Acceptance check: every P0 and P1 validation rule has a failing-input test, and an import failure is verified not to replace the active case.

### 8. P2: system-font rendering can vary between judge machines

Evidence: the design relies on `Iowan Old Style`, `Palatino Linotype`, `Avenir Next`, and `Gill Sans` system stacks (`app/globals.css:9-12`) and does not ship font files.

Impact: the distinctive italic display and compact labels may fall back to different fonts across operating systems, changing line breaks and the visual balance of the hero and recommendation amounts.

Recommendation: decide whether the current system-font look is intentional. If visual consistency matters, add one permissively licensed self-hosted display and sans font, record it in `LICENSES.md`, and keep the fallback stack. This is a polish choice, not a reason to delay the core fixes.

Acceptance check: the hero, recommendation amount, and section headings keep acceptable line breaks in the supported desktop and mobile browsers used for the final recording.

## What passed

- `npm test`: 7 tests passed, including all 25 public cases and every published tariff boundary.
- `npm run typecheck`: passed with no TypeScript errors.
- `npm run build`: passed and produced static `/` and `/_not-found` routes.
- Desktop browser QA: the seeded PUB-01 flow, household selector, target-date calculator, scrubber, and visible chart markers worked without console warnings or errors.
- Mobile browser QA at 390px: the page collapsed into a readable single-column flow, controls remained reachable, and the chart and calculator stayed usable.
- The page has a skip link, labeled native controls, visible focus styling, reduced-motion CSS, semantic headings, an accessible chart label, and an inline import error region.
- `LICENSES.md` lists the runtime and development dependencies used by the project, and the listed licenses are permissive.

## Deliberately not recommended

I do not recommend adding a backend, authentication, a chart dependency, a forecasting model, or a wholesale visual redesign. The local deterministic ledger is a good fit for this problem and is one of the project's strongest technical decisions. The current interface already has a clear identity. Fix the input boundaries, make the mobile table's behavior obvious, and shorten the demo script before spending time on new features.

## Evidence and rule sources

- Repository implementation: [lib/fixture.ts](/F:/Github/lsh26-t028-p10/lib/fixture.ts), [lib/ledger.ts](/F:/Github/lsh26-t028-p10/lib/ledger.ts), [components/meter-dashboard.tsx](/F:/Github/lsh26-t028-p10/components/meter-dashboard.tsx), and [app/globals.css](/F:/Github/lsh26-t028-p10/app/globals.css).
- Project claims and requirement mapping: [README.md](/F:/Github/lsh26-t028-p10/README.md), [HACKATHON_CONTEXT.md](/F:/Github/lsh26-t028-p10/HACKATHON_CONTEXT.md), [evaluation-manifest.json](/F:/Github/lsh26-t028-p10/evaluation-manifest.json), and [docs/DEMO.md](/F:/Github/lsh26-t028-p10/docs/DEMO.md).
- The attached Word documents were read structurally. LibreOffice was unavailable in this Windows environment, so page-image rendering of the attachments could not be completed. Their extracted text was still used to compare the stated submission and scoring rules. The live hackathon arena and orientation page were also checked for the current published wording.
