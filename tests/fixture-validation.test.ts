import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { FixtureValidationError, formatFixtureError } from "../lib/fixture-errors.ts";
import { parseFixtureJson, validateFixture, validateHouseholdCase } from "../lib/fixture.ts";
import { compareRechargeHabits } from "../lib/ledger.ts";
import { bdtToPaisa } from "../lib/money.ts";
import type { Fixture, HouseholdCase } from "../lib/types.ts";

const fixture: Fixture = JSON.parse(
  readFileSync(new URL("../data/P10_prepaid_meter_public.json", import.meta.url), "utf8"),
);
const sample = () => structuredClone(fixture.cases[0]);

function captureError(action: () => unknown): FixtureValidationError {
  try {
    action();
  } catch (error) {
    assert.ok(error instanceof FixtureValidationError);
    return error;
  }
  assert.fail("Expected a structured validation error");
}

test("a retained JSON error can be displayed in either language", () => {
  const error = captureError(() => parseFixtureJson("{"));
  assert.equal(error.code, "invalid_json");
  assert.equal(error.message, "That file is not valid JSON");
  assert.equal(formatFixtureError(error, "en"), error.message);
  assert.equal(formatFixtureError(error, "bn"), "ফাইলটিতে সঠিক JSON নেই।");
  assert.equal(formatFixtureError(error, "en"), error.message);
});

test("localized validation preserves the case ID and technical field path", () => {
  const household = sample();
  household.comparison.low_threshold_bdt = "-1.00";
  const error = captureError(() => validateHouseholdCase(household));
  assert.equal(error.code, "non_negative_amount");
  assert.equal(error.message, "PUB-01: low_threshold_bdt must be non-negative");
  assert.deepEqual(error.details, { caseId: "PUB-01", field: "comparison.low_threshold_bdt" });
  assert.equal(
    formatFixtureError(error, "bn"),
    "PUB-01: comparison.low_threshold_bdt শূন্য বা তার বেশি হতে হবে।",
  );
});

test("Bangla error formatting uses codes rather than replacing English text", () => {
  const error = new FixtureValidationError("text_required", "An independently worded English message", {
    field: "opening_balance_bdt",
  });
  assert.equal(formatFixtureError(error, "bn"), "opening_balance_bdt টেক্সট হিসেবে দিতে হবে।");
  assert.equal(formatFixtureError(error, "en"), "An independently worded English message");
  assert.match(formatFixtureError(new Error("File read failed"), "bn"), /ফিক্সচারটি পড়া যায়নি/);
});

test("date errors retain their original English text and gain field context", () => {
  const household = sample();
  household.days[0].date = "2026-02-30";
  const error = captureError(() => validateHouseholdCase(household));
  assert.equal(error.message, "Invalid date: 2026-02-30");
  assert.equal(error.code, "invalid_date");
  assert.deepEqual(error.details, {
    caseId: "PUB-01",
    field: "days[].date",
    value: "2026-02-30",
  });
  assert.match(formatFixtureError(error, "bn"), /days\[\]\.date/);
  assert.match(formatFixtureError(error, "bn"), /2026-02-30/);
});

test("amount errors retain their original English text and gain field context", () => {
  const household = sample();
  household.recharges[0].amount_bdt = "12.345";
  const error = captureError(() => validateHouseholdCase(household));
  assert.equal(error.message, "Invalid BDT amount: 12.345");
  assert.equal(error.code, "invalid_amount");
  assert.equal(error.details.field, "recharges[].amount_bdt");
  assert.match(formatFixtureError(error, "bn"), /recharges\[\]\.amount_bdt/);
  assert.match(formatFixtureError(error, "bn"), /দশমিকের পরে সর্বোচ্চ দুই অঙ্ক/);
});

test("wrapper fixtures reject duplicate case IDs but preserve distinct cases", () => {
  const first = sample();
  const second = sample();
  const wrapper = { ...fixture, cases: [first, second] };
  const error = captureError(() => parseFixtureJson(JSON.stringify(wrapper)));
  assert.equal(error.code, "duplicate_case_id");
  assert.equal(error.message, "Duplicate case_id: PUB-01");
  assert.match(formatFixtureError(error, "bn"), /case_id PUB-01 একাধিকবার আছে/);
  assert.throws(() => validateFixture(wrapper), /Duplicate case_id/);

  second.case_id = "HIDDEN-02";
  const cases = parseFixtureJson(JSON.stringify(wrapper));
  assert.deepEqual(cases.map((household) => household.case_id), ["PUB-01", "HIDDEN-02"]);
});

test("comparison needs three distinct months with readings", () => {
  const household = sample();
  household.comparison.months[1] = household.comparison.months[0];
  const error = captureError(() => validateHouseholdCase(household));
  assert.equal(error.code, "distinct_comparison_months");
  assert.match(error.message, /three distinct months/);
  assert.match(formatFixtureError(error, "bn"), /comparison\.months/);
  assert.match(formatFixtureError(error, "bn"), /তিনটি মাস আলাদা/);
});

test("BDT converts exactly at the positive and negative safe-paisa boundaries", () => {
  assert.equal(bdtToPaisa("90071992547409.91"), Number.MAX_SAFE_INTEGER);
  assert.equal(bdtToPaisa("-90071992547409.91"), -Number.MAX_SAFE_INTEGER);
  assert.equal(bdtToPaisa("90071992547409.90"), Number.MAX_SAFE_INTEGER - 1);
  assert.equal(bdtToPaisa("001.2"), 120);
  assert.equal(bdtToPaisa(123.45), 12_345);
});

test("BDT rejects amounts beyond safe integer paisa instead of rounding them", () => {
  for (const value of ["90071992547409.92", "-90071992547409.92", "999999999999999999999999999999.99"]) {
    const error = captureError(() => bdtToPaisa(value));
    assert.equal(error.code, "unsafe_amount");
    assert.match(error.message, /safe integer-paisa range/);
    assert.match(formatFixtureError(error, "bn"), /নির্ভুল হিসাবের সীমার বাইরে/);
  }
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => bdtToPaisa(value), /Invalid BDT amount/);
  }
});

test("every imported money field rejects unsafe paisa", () => {
  const changes: Array<(household: HouseholdCase) => void> = [
    (household) => { household.opening_balance_bdt = "90071992547409.92"; },
    (household) => { household.recharges[0].amount_bdt = "90071992547409.92"; },
    ...(["opening_balance_bdt", "low_threshold_bdt", "low_amount_bdt", "monthly_amount_bdt"] as const)
      .map((field) => (household: HouseholdCase) => { household.comparison[field] = "90071992547409.92"; }),
  ];
  for (const change of changes) {
    const household = sample();
    change(household);
    const error = captureError(() => validateHouseholdCase(household));
    assert.equal(error.code, "unsafe_amount");
    assert.equal(error.details.caseId, "PUB-01");
    assert.ok(error.details.field);
  }
});

test("a valid hidden-style comparison may differ by three months of fixed charges", () => {
  const household = sample();
  household.case_id = "HIDDEN-HIGH-OPENING";
  household.comparison.opening_balance_bdt = "1000000.00";
  validateHouseholdCase(household);
  const comparison = compareRechargeHabits(household);
  assert.equal(comparison.energyDifferencePaisa, 0);
  assert.equal(comparison.differencePaisa, 24_600);
  assert.deepEqual(comparison.lowBalance.fixedMonths, []);
  assert.equal(comparison.monthly.fixedMonths.length, 3);
});
