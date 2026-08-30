import type { Language } from "./locale.ts";

export type FixtureErrorCode =
  | "invalid_json"
  | "object_required"
  | "field_required"
  | "text_required"
  | "array_required"
  | "non_empty_days"
  | "invalid_date"
  | "whole_non_negative_units"
  | "consecutive_readings"
  | "recharge_outside_window"
  | "positive_amount"
  | "non_negative_amount"
  | "today_last_reading"
  | "positive_daily_units"
  | "target_before_today"
  | "three_comparison_months"
  | "distinct_comparison_months"
  | "invalid_comparison_month"
  | "comparison_month_missing"
  | "expected_value"
  | "empty_fixture"
  | "duplicate_case_id"
  | "invalid_amount"
  | "unsafe_amount";

export type FixtureErrorDetails = {
  caseId?: string;
  field?: string;
  value?: string;
  expected?: string;
};

/** Keeps the original English error while retaining data for another language. */
export class FixtureValidationError extends Error {
  readonly code: FixtureErrorCode;
  readonly details: FixtureErrorDetails;

  constructor(code: FixtureErrorCode, message: string, details: FixtureErrorDetails = {}) {
    super(message);
    this.name = "FixtureValidationError";
    this.code = code;
    this.details = details;
  }
}

const banglaReasons: Record<FixtureErrorCode, (details: FixtureErrorDetails) => string> = {
  invalid_json: () => "ফাইলটিতে সঠিক JSON নেই।",
  object_required: ({ field }) => `${field ?? "case"} একটি JSON অবজেক্ট হতে হবে।`,
  field_required: ({ field }) => `${field} দিতে হবে।`,
  text_required: ({ field }) => `${field} টেক্সট হিসেবে দিতে হবে।`,
  array_required: ({ field }) => `${field} একটি অ্যারে হতে হবে।`,
  non_empty_days: () => "days-এ অন্তত একটি দিনের রিডিং থাকতে হবে।",
  invalid_date: ({ field, value }) => `${field ?? "date"}-এ সঠিক YYYY-MM-DD তারিখ দিন। দেওয়া মান: ${value}`,
  whole_non_negative_units: ({ field }) => `${field} পূর্ণসংখ্যা এবং শূন্য বা তার বেশি হতে হবে।`,
  consecutive_readings: () => "days-এর রিডিং তারিখের ক্রমে থাকতে হবে। মাঝখানে কোনো দিন বাদ দেওয়া যাবে না।",
  recharge_outside_window: ({ value }) => `recharges[].date-এর ${value} তারিখটি প্রথম ও শেষ রিডিংয়ের মধ্যে হতে হবে।`,
  positive_amount: ({ field }) => `${field} শূন্যের বেশি হতে হবে।`,
  non_negative_amount: ({ field }) => `${field} শূন্য বা তার বেশি হতে হবে।`,
  today_last_reading: () => "today শেষ রিডিংয়ের তারিখের সমান হতে হবে।",
  positive_daily_units: () => "usual_daily_units একটি ধনাত্মক পূর্ণসংখ্যা হতে হবে।",
  target_before_today: () => "target_date, today-এর আগের তারিখ হতে পারবে না।",
  three_comparison_months: () => "comparison.months-এ তিনটি মাস দিতে হবে।",
  distinct_comparison_months: () => "comparison.months-এর তিনটি মাস আলাদা হতে হবে। একই মাস একাধিকবার দেওয়া যাবে না।",
  invalid_comparison_month: () => "comparison.months-এর প্রতিটি মাস YYYY-MM আকারে দিতে হবে।",
  comparison_month_missing: ({ value }) => `comparison.months-এর ${value} মাসের কোনো রিডিং নেই।`,
  expected_value: ({ field, expected }) => `${field}-এর মান ${expected} হতে হবে।`,
  empty_fixture: () => "ফিক্সচারের cases-এ অন্তত একটি কেস থাকতে হবে।",
  duplicate_case_id: ({ value }) => `case_id ${value} একাধিকবার আছে। প্রতিটি কেসের case_id আলাদা হতে হবে।`,
  invalid_amount: ({ field, value }) => `${field ?? "BDT amount"}-এ সঠিক টাকার পরিমাণ দিন, দশমিকের পরে সর্বোচ্চ দুই অঙ্ক। দেওয়া মান: ${value}`,
  unsafe_amount: ({ field, value }) => `${field ?? "BDT amount"}-এর ${value} পরিমাণটি পূর্ণ পয়সায় নির্ভুল হিসাবের সীমার বাইরে।`,
};

/** Store the error itself in UI state, then call this during render. */
export function formatFixtureError(error: unknown, language: Language = "en"): string {
  if (language === "en") {
    return error instanceof Error ? error.message : "Could not read that fixture";
  }
  if (!(error instanceof FixtureValidationError)) return "ফিক্সচারটি পড়া যায়নি। ফাইলটি আবার পরীক্ষা করুন।";
  const prefix = error.details.caseId ? `${error.details.caseId}: ` : "";
  return `${prefix}${banglaReasons[error.code](error.details)}`;
}
