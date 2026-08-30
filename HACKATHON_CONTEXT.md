# LofiStack Hackathon 2026 context

This repository contains KotoDin, the team's P10 project. The separate P01 project is [KajChole](https://github.com/rajin-khan/lsh26-t028-p01).

## Team and repository mapping

- Team: GROCERYBOIX
- Team ID: LSH26-T028
- Team leader: Rajin Khan, whose registered arena name is Adib Ar Rahman Khan
- P10 repository: `rajin-khan/lsh26-t028-p10`
- P01 repository: `rajin-khan/lsh26-t028-p01`
- Event start code: `LSH26-8490-C900`

## Sources and submission timing

Reviewed on 30 August 2026 against the supplied Submission Kit v2.2, including `SUBMISSION-GUIDE.md`, `CLARIFICATIONS.md`, the templates, and the P10 fixture. The checked-in fixture matches the kit byte for byte. The earlier Word documents and Discord summaries contain different scoring, demo, and deadline information.

The [current live guide](https://live.hackathon.lofistack.com/guide) says building ends at 10 PM, submission closes at midnight, and a late window runs until 1 AM. It also says the live guide and arena supersede earlier information. The supplied v2.2 kit instead requires a valid receipt before 10 PM and says changes need a numbered correction. The supplied Discord replies at 7:02 PM and 7:35 PM mention two extra hours for submission.

These sources conflict. This repository does not treat the extension as settled: aim to finish and submit before 10 PM Bangladesh time, and confirm any later allowance with the organizers. A local commit timestamp is not a submission receipt.

Other reviewed pages: [event arena](https://live.hackathon.lofistack.com/), [orientation](https://hackathon.lofistack.com/orientation-page), [hackathon site](https://hackathon.lofistack.com/), and [LofiStack](https://www.lofistack.com/). The company site adds no P10 calculation requirements.

## Requirements shared by the current sources

Each problem has four required items. The early bonus requires at least three fully working items on both problems. Two public repositories and two live applications go into one leader-submitted form, with each exact 40-character judged commit SHA. The deployed application must match that SHA. Keep the history intact and keep both applications and repositories available until results.

Each repository needs source code, `README.md`, `evaluation-manifest.json`, `EVENT.md`, and `LICENSES.md`. The README and manifest must describe the solving method and all three registered members' contributions. AI assistance and pre-event material must be disclosed. Secrets do not belong in the repository.

Under kit v2.2, a demo video is optional and no longer than three minutes. If supplied, it must cover the method and every member's contribution. This differs from the older 60-second-minimum video instructions. P10 is deployed at [kotodin.vercel.app](https://kotodin.vercel.app/). Public repository access, confirming that the deployment matches the submitted commit, and the submission form remain team-lead steps.

## P10: prepaid meter recharge advisor

The app should let a household understand where prepaid electricity money goes, see its balance over time, predict when the balance will run out, calculate a target-date recharge, and compare two recharge habits.

The four required items are:

1. Create a household with at least six months of daily unit readings and recharge history. Include a light month, a heavy summer month, and a month with a large recharge in the last week.
2. Rebuild the balance day by day. Use the month's running unit total to select each day's slab. Apply the 42 taka demand charge and 40 taka meter rent on the first recharge of each month. Add 5% VAT to energy. Show a balance line with every recharge marked.
3. Answer two questions. When will today's balance run out at the usual daily use? How much must be recharged today to last until a user-selected date? Break the amount into energy, higher-slab cost, fixed charges, and VAT.
4. Compare "low balance" recharges with "monthly" recharges over the same three months and the same daily consumption. Show the cost difference.

Use only this tariff:

- Units 1 to 75: 4.63 taka per unit
- Units 76 to 200: 5.26 taka per unit
- Units 201 to 300: 5.63 taka per unit
- Units 301 to 400: 5.83 taka per unit
- Units 401 to 600: 9.30 taka per unit
- Units 601 and above: 10.70 taka per unit
- Demand charge: 42 taka once per month, on the first recharge
- Meter rent: 40 taka once per month, on the first recharge
- VAT: 5% of the energy amount

## Clarifications judges will enforce

- The slab counter resets each calendar month.
- Recharge timing cannot create an energy-rate saving. Both habits use identical daily consumption and the same monthly slab counter.
- "Cost" means money consumed by the meter: energy, VAT, and applicable monthly fixed charges. It does not mean the amount deposited.
- The two habits may legitimately cost the same. Any difference can come only from how many monthly first-recharge fixed charges occur.
- The low-balance habit recharges the case amount at the start of a day whose balance is below the case threshold.
- The monthly habit recharges the case amount on the first of each month.
- Both simulations start from the case's opening balance and run for the same three named months.

## Verification focus

Verify the tariff and daily balance before the forecasts and habit comparison. Tests cover boundaries at 75/76, 200/201, 300/301, 400/401, and 600/601 units. Judge data must use the same shape as the supplied samples; importing it must either recalculate the application or show a useful validation error without losing the current case.

The UI must show a light month, a heavy month, a late-month recharge, a readable balance chart, and a checkable cost breakdown. Switching English and Bangla changes presentation only. It must not change the case, target date, chart selection, or calculated amounts. Recharge timing must never be described as an energy-rate saving.
