import { addDays, monthOf, parseDate } from "./date.ts";
import {
  FixtureValidationError,
  type FixtureErrorCode,
  type FixtureErrorDetails,
} from "./fixture-errors.ts";
import { bdtToPaisa } from "./money.ts";
import type { Fixture, HouseholdCase } from "./types.ts";

function assert(
  condition: unknown,
  message: string,
  code: FixtureErrorCode,
  details: FixtureErrorDetails = {},
): asserts condition {
  if (!condition) throw new FixtureValidationError(code, message, details);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDate(value: string, caseId: string, field: string): void {
  try {
    parseDate(value);
  } catch (error) {
    throw new FixtureValidationError(
      "invalid_date",
      error instanceof Error ? error.message : `Invalid date: ${value}`,
      { caseId, field, value },
    );
  }
}

function readAmount(value: string, caseId: string, field: string): number {
  try {
    return bdtToPaisa(value);
  } catch (error) {
    if (error instanceof FixtureValidationError) {
      throw new FixtureValidationError(error.code, error.message, {
        ...error.details,
        caseId,
        field,
      });
    }
    throw error;
  }
}

export function validateHouseholdCase(value: unknown): HouseholdCase {
  assert(isRecord(value), "Each case must be a JSON object", "object_required");
  assert(
    typeof value.case_id === "string" && value.case_id.trim().length > 0,
    "case_id is required",
    "field_required",
    { field: "case_id" },
  );
  const caseId = value.case_id;
  assert(typeof value.opening_balance_bdt === "string", `${caseId}: opening_balance_bdt must be text`, "text_required", { caseId, field: "opening_balance_bdt" });
  readAmount(value.opening_balance_bdt, caseId, "opening_balance_bdt");
  assert(Array.isArray(value.days) && value.days.length > 0, `${caseId}: days must not be empty`, "non_empty_days", { caseId });

  let previousDate: string | null = null;
  for (const rawDay of value.days) {
    assert(isRecord(rawDay), `${caseId}: every day must be an object`, "object_required", { caseId, field: "days[]" });
    assert(typeof rawDay.date === "string", `${caseId}: every day needs a date`, "field_required", { caseId, field: "days[].date" });
    validateDate(rawDay.date, caseId, "days[].date");
    assert(Number.isInteger(rawDay.units) && Number(rawDay.units) >= 0, `${caseId}: units must be whole and non-negative`, "whole_non_negative_units", { caseId, field: "days[].units" });
    if (previousDate) {
      assert(rawDay.date === addDays(previousDate, 1), `${caseId}: readings must be consecutive`, "consecutive_readings", { caseId });
    }
    previousDate = rawDay.date;
  }

  assert(Array.isArray(value.recharges), `${caseId}: recharges must be an array`, "array_required", { caseId, field: "recharges" });
  const firstReadingDate = value.days[0].date;
  const lastReadingDate = previousDate;
  assert(lastReadingDate, `${caseId}: days must contain at least one reading`, "non_empty_days", { caseId });
  for (const rawRecharge of value.recharges) {
    assert(isRecord(rawRecharge), `${caseId}: every recharge must be an object`, "object_required", { caseId, field: "recharges[]" });
    assert(typeof rawRecharge.date === "string", `${caseId}: recharge date is required`, "field_required", { caseId, field: "recharges[].date" });
    validateDate(rawRecharge.date, caseId, "recharges[].date");
    assert(
      rawRecharge.date >= firstReadingDate && rawRecharge.date <= lastReadingDate,
      `${caseId}: recharge date ${rawRecharge.date} must fall within the reading window`,
      "recharge_outside_window",
      { caseId, value: rawRecharge.date },
    );
    assert(typeof rawRecharge.amount_bdt === "string", `${caseId}: recharge amount must be text`, "text_required", { caseId, field: "recharges[].amount_bdt" });
    assert(readAmount(rawRecharge.amount_bdt, caseId, "recharges[].amount_bdt") > 0, `${caseId}: recharge amounts must be positive`, "positive_amount", { caseId, field: "recharges[].amount_bdt" });
  }

  assert(typeof value.today === "string", `${caseId}: today is required`, "field_required", { caseId, field: "today" });
  validateDate(value.today, caseId, "today");
  assert(value.today === previousDate, `${caseId}: today must equal the final reading date`, "today_last_reading", { caseId });
  assert(Number.isInteger(value.usual_daily_units) && Number(value.usual_daily_units) > 0, `${caseId}: usual_daily_units must be positive`, "positive_daily_units", { caseId });
  assert(typeof value.target_date === "string", `${caseId}: target_date is required`, "field_required", { caseId, field: "target_date" });
  validateDate(value.target_date, caseId, "target_date");
  assert(value.target_date >= value.today, `${caseId}: target_date cannot be before today`, "target_before_today", { caseId });

  const comparison = value.comparison;
  assert(isRecord(comparison), `${caseId}: comparison is required`, "object_required", { caseId, field: "comparison" });
  assert(Array.isArray(comparison.months) && comparison.months.length === 3, `${caseId}: comparison needs three months`, "three_comparison_months", { caseId });
  for (const month of comparison.months) {
    assert(typeof month === "string" && /^\d{4}-\d{2}$/.test(month), `${caseId}: invalid comparison month`, "invalid_comparison_month", { caseId });
    assert(value.days.some((day) => isRecord(day) && typeof day.date === "string" && monthOf(day.date) === month), `${caseId}: comparison month ${month} has no readings`, "comparison_month_missing", { caseId, value: month });
  }
  assert(new Set(comparison.months).size === 3, `${caseId}: comparison needs three distinct months`, "distinct_comparison_months", { caseId });
  assert(comparison.source === "readings", `${caseId}: comparison source must be readings`, "expected_value", { caseId, field: "comparison.source", expected: "readings" });
  assert(comparison.daily_units === null, `${caseId}: comparison daily_units must be null`, "expected_value", { caseId, field: "comparison.daily_units", expected: "null" });
  for (const field of [
    "opening_balance_bdt",
    "low_threshold_bdt",
    "low_amount_bdt",
    "monthly_amount_bdt",
  ] as const) {
    const path = `comparison.${field}`;
    assert(typeof comparison[field] === "string", `${caseId}: ${field} must be text`, "text_required", { caseId, field: path });
    const amount = readAmount(comparison[field], caseId, path);
    if (field === "opening_balance_bdt" || field === "low_threshold_bdt") {
      assert(amount >= 0, `${caseId}: ${field} must be non-negative`, "non_negative_amount", { caseId, field: path });
    } else {
      assert(amount > 0, `${caseId}: ${field} must be positive`, "positive_amount", { caseId, field: path });
    }
  }

  return value as HouseholdCase;
}

function validateCaseList(values: unknown[]): HouseholdCase[] {
  assert(values.length > 0, "Fixture must contain at least one case", "empty_fixture");
  const cases = values.map(validateHouseholdCase);
  const ids = new Set<string>();
  for (const household of cases) {
    assert(!ids.has(household.case_id), `Duplicate case_id: ${household.case_id}`, "duplicate_case_id", { value: household.case_id });
    ids.add(household.case_id);
  }
  return cases;
}

export function parseFixtureJson(text: string): HouseholdCase[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new FixtureValidationError("invalid_json", "That file is not valid JSON");
  }

  if (isRecord(parsed) && Array.isArray(parsed.cases)) {
    assert(parsed.problem_id === "P10", "Fixture problem_id must be P10", "expected_value", { field: "problem_id", expected: "P10" });
    return validateCaseList(parsed.cases);
  }
  return [validateHouseholdCase(parsed)];
}

export function validateFixture(fixture: Fixture): Fixture {
  assert(fixture.problem_id === "P10", "Fixture problem_id must be P10", "expected_value", { field: "problem_id", expected: "P10" });
  validateCaseList(fixture.cases);
  return fixture;
}
