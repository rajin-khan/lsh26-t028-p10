# LofiStack Hackathon 2026 context

This repository is the team's P10 project. The shared event strategy and P01 details are documented in the sibling repository at `/Users/rajin/Developer/LOFISTACK/lsh26-t028-p-1/HACKATHON_CONTEXT.md`.

## Team and repository mapping

- Team: GROCERYBOIX
- Team ID: LSH26-T028
- Team leader: Rajin Khan, whose registered arena name is Adib Ar Rahman Khan
- This repository is the team's P10 project.
- The sibling repository `lsh26-t028-p-1` is the team's P01 project.
- Event start code: `LSH26-8490-C900`

## Event rules that affect implementation

The live v2.1 score is out of 100: functionality 30, technical execution 15, UI and UX 15, demo and documentation 15, difficulty credit 15, and early submission 10. Each problem has four required items. The early bonus unlocks only when both projects complete at least three of their four required items. The Google Form server receipt is the official early-bonus time; commit times are not used. Building ends and unpublished fixture testing begins at 10 PM. The arena accepts submission-form corrections until midnight and marks submissions from midnight to 1 AM late.

The team submits two public repositories through one leader-submitted form. The form requires each public repository URL, the exact 40-character commit SHA being judged, and a live URL. Keep history intact. AI tools and pre-event material are allowed but must be disclosed. Never commit secrets.

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

## Build priority

Build the tariff engine and balance history first. Then add the run-out and target-date calculations. Then add the habit comparison. Include visible calculation explanations and boundary tests for 75/76, 200/201, 300/301, 400/401, and 600/601 units. Do not claim a recharge timing energy saving. The strongest demo is a seeded household with the three required month types, a readable balance chart, and an auditable cost breakdown.

The P01 sibling project uses existing CurrentJabe electricity work as its starting point. P10 may share the team's visual language and disclosed pre-event material, but it must remain a separate repository and a distinct working product.
