import { addDays, monthOf, parseDate } from "./date.ts";
import { bdtToPaisa } from "./money.ts";
import type { Fixture, HouseholdCase } from "./types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateHouseholdCase(value: unknown): HouseholdCase {
  assert(isRecord(value), "Each case must be a JSON object");
  assert(typeof value.case_id === "string" && value.case_id.trim().length > 0, "case_id is required");
  assert(typeof value.opening_balance_bdt === "string", `${value.case_id}: opening_balance_bdt must be text`);
  bdtToPaisa(value.opening_balance_bdt);
  assert(Array.isArray(value.days) && value.days.length > 0, `${value.case_id}: days must not be empty`);

  let previousDate: string | null = null;
  for (const rawDay of value.days) {
    assert(isRecord(rawDay), `${value.case_id}: every day must be an object`);
    assert(typeof rawDay.date === "string", `${value.case_id}: every day needs a date`);
    parseDate(rawDay.date);
    assert(Number.isInteger(rawDay.units) && Number(rawDay.units) >= 0, `${value.case_id}: units must be whole and non-negative`);
    if (previousDate) {
      assert(rawDay.date === addDays(previousDate, 1), `${value.case_id}: readings must be consecutive`);
    }
    previousDate = rawDay.date;
  }

  assert(Array.isArray(value.recharges), `${value.case_id}: recharges must be an array`);
  for (const rawRecharge of value.recharges) {
    assert(isRecord(rawRecharge), `${value.case_id}: every recharge must be an object`);
    assert(typeof rawRecharge.date === "string", `${value.case_id}: recharge date is required`);
    parseDate(rawRecharge.date);
    assert(typeof rawRecharge.amount_bdt === "string", `${value.case_id}: recharge amount must be text`);
    assert(bdtToPaisa(rawRecharge.amount_bdt) > 0, `${value.case_id}: recharge amounts must be positive`);
  }

  assert(typeof value.today === "string", `${value.case_id}: today is required`);
  parseDate(value.today);
  assert(value.today === previousDate, `${value.case_id}: today must equal the final reading date`);
  assert(Number.isInteger(value.usual_daily_units) && Number(value.usual_daily_units) > 0, `${value.case_id}: usual_daily_units must be positive`);
  assert(typeof value.target_date === "string", `${value.case_id}: target_date is required`);
  parseDate(value.target_date);
  assert(value.target_date >= value.today, `${value.case_id}: target_date cannot be before today`);

  const comparison = value.comparison;
  assert(isRecord(comparison), `${value.case_id}: comparison is required`);
  assert(Array.isArray(comparison.months) && comparison.months.length === 3, `${value.case_id}: comparison needs three months`);
  for (const month of comparison.months) {
    assert(typeof month === "string" && /^\d{4}-\d{2}$/.test(month), `${value.case_id}: invalid comparison month`);
    assert(value.days.some((day) => isRecord(day) && typeof day.date === "string" && monthOf(day.date) === month), `${value.case_id}: comparison month ${month} has no readings`);
  }
  assert(comparison.source === "readings", `${value.case_id}: comparison source must be readings`);
  assert(comparison.daily_units === null, `${value.case_id}: comparison daily_units must be null`);
  for (const field of [
    "opening_balance_bdt",
    "low_threshold_bdt",
    "low_amount_bdt",
    "monthly_amount_bdt",
  ] as const) {
    assert(typeof comparison[field] === "string", `${value.case_id}: ${field} must be text`);
    bdtToPaisa(comparison[field]);
  }

  return value as HouseholdCase;
}

export function parseFixtureJson(text: string): HouseholdCase[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON");
  }

  if (isRecord(parsed) && Array.isArray(parsed.cases)) {
    assert(parsed.problem_id === "P10", "Fixture problem_id must be P10");
    return parsed.cases.map(validateHouseholdCase);
  }
  return [validateHouseholdCase(parsed)];
}

export function validateFixture(fixture: Fixture): Fixture {
  fixture.cases.forEach(validateHouseholdCase);
  return fixture;
}
