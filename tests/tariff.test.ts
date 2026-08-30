import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseFixtureJson, validateHouseholdCase } from "../lib/fixture.ts";
import {
  calculateTargetRecharge,
  compareRechargeHabits,
  forecastRunOut,
  reconstructLedger,
} from "../lib/ledger.ts";
import { addDays } from "../lib/date.ts";
import { FIRST_RECHARGE_FIXED_PAISA, priceUnits } from "../lib/tariff.ts";
import type { HouseholdCase } from "../lib/types.ts";

const fixtureText = readFileSync(new URL("../data/P10_prepaid_meter_public.json", import.meta.url), "utf8");
const publicCases = parseFixtureJson(fixtureText);

test("all 25 public cases pass fixture validation", () => {
  assert.equal(publicCases.length, 25);
  assert.equal(publicCases[0].case_id, "PUB-01");
  assert.equal(publicCases[24].case_id, "PUB-25");
});

test("rejects empty fixture case lists", () => {
  assert.throws(
    () => parseFixtureJson(JSON.stringify({ problem_id: "P10", cases: [] })),
    /at least one case/,
  );
});

test("rejects invalid comparison amounts", () => {
  const negativeThreshold = structuredClone(publicCases[0]);
  negativeThreshold.comparison.low_threshold_bdt = "-1.00";
  assert.throws(() => validateHouseholdCase(negativeThreshold), /low_threshold_bdt must be non-negative/);

  const zeroDeposit = structuredClone(publicCases[0]);
  zeroDeposit.comparison.monthly_amount_bdt = "0.00";
  assert.throws(() => validateHouseholdCase(zeroDeposit), /monthly_amount_bdt must be positive/);
});

test("rejects recharges outside the reading window", () => {
  const household = structuredClone(publicCases[0]);
  household.recharges.push({ date: "2025-12-31", amount_bdt: "100.00" });
  assert.throws(() => validateHouseholdCase(household), /must fall within the reading window/);
});

test("progressively splits units across every tariff boundary", () => {
  const crossing75 = priceUnits(74, 2);
  assert.equal(crossing75.energyPaisa, 463 + 526);
  assert.deepEqual(crossing75.bands, [
    { units: 1, ratePaisa: 463 },
    { units: 1, ratePaisa: 526 },
  ]);

  const crossing200 = priceUnits(199, 2);
  assert.equal(crossing200.energyPaisa, 526 + 563);
  const crossing300 = priceUnits(299, 2);
  assert.equal(crossing300.energyPaisa, 563 + 583);
  const crossing400 = priceUnits(399, 2);
  assert.equal(crossing400.energyPaisa, 583 + 930);
  const crossing600 = priceUnits(599, 2);
  assert.equal(crossing600.energyPaisa, 930 + 1070);
});

test("prices 601 monthly units across all six slabs", () => {
  const charge = priceUnits(0, 601);
  const expected = 75 * 463 + 125 * 526 + 100 * 563 + 100 * 583 + 200 * 930 + 1070;
  assert.equal(charge.energyPaisa, expected);
  assert.equal(charge.baseEnergyPaisa, 601 * 463);
  assert.equal(charge.higherSlabPaisa, expected - 601 * 463);
  assert.equal(charge.vatPaisa, Math.round(expected * 0.05));
});

test("deducts fixed charges once on each month's first recharge", () => {
  const days = Array.from({ length: 32 }, (_, index) => ({ date: addDays("2026-01-01", index), units: 0 }));
  const household: HouseholdCase = {
    case_id: "TEST-FIXED",
    opening_balance_bdt: "1000.00",
    days,
    recharges: [
      { date: "2026-01-01", amount_bdt: "100.00" },
      { date: "2026-01-02", amount_bdt: "100.00" },
      { date: "2026-02-01", amount_bdt: "100.00" },
    ],
    today: "2026-02-01",
    usual_daily_units: 1,
    target_date: "2026-02-02",
    comparison: {
      months: ["2026-01", "2026-01", "2026-02"],
      source: "readings",
      daily_units: null,
      opening_balance_bdt: "0.00",
      low_threshold_bdt: "100.00",
      low_amount_bdt: "500.00",
      monthly_amount_bdt: "500.00",
    },
  };
  const ledger = reconstructLedger(household);
  assert.equal(ledger.totals.fixedPaisa, FIRST_RECHARGE_FIXED_PAISA * 2);
  assert.equal(ledger.days[0].demandChargePaisa, 4_200);
  assert.equal(ledger.days[1].demandChargePaisa, 0);
  assert.equal(ledger.days[31].meterRentPaisa, 4_000);
});

test("PUB-01 reconstructs every day and forecasts a run-out", () => {
  const household = publicCases[0];
  const ledger = reconstructLedger(household);
  assert.equal(ledger.days.length, 181);
  assert.equal(ledger.months.length, 6);
  assert.equal(ledger.months[4].units, 673);
  assert.equal(ledger.days.filter((day) => day.rechargePaisa > 0).length, 18);
  const runOutDate = forecastRunOut(household, ledger);
  assert.match(runOutDate ?? "", /^2026-/);
});

test("target recommendation reconciles to projected cost less balance", () => {
  const household = publicCases[0];
  const ledger = reconstructLedger(household);
  const recommendation = calculateTargetRecharge(household, ledger, household.target_date);
  assert.equal(recommendation.energyPaisa, recommendation.baseEnergyPaisa + recommendation.higherSlabPaisa);
  assert.equal(
    recommendation.rechargePaisa,
    Math.max(0, recommendation.projectedCostPaisa - ledger.currentBalancePaisa),
  );
  assert.equal(recommendation.units, recommendation.days * household.usual_daily_units);
});

test("rejects a target date before today", () => {
  const household = publicCases[0];
  const ledger = reconstructLedger(household);
  assert.throws(
    () => calculateTargetRecharge(household, ledger, "2026-06-29"),
    /Target date cannot be before today/,
  );
});

test("habit comparison never invents an energy-rate saving", () => {
  for (const household of publicCases) {
    const comparison = compareRechargeHabits(household);
    assert.equal(comparison.energyDifferencePaisa, 0, household.case_id);
    assert.equal(
      comparison.differencePaisa,
      Math.abs(comparison.lowBalance.fixedPaisa - comparison.monthly.fixedPaisa),
      household.case_id,
    );
  }
});
