import assert from "node:assert/strict";
import test from "node:test";

import { dateLabel, dateParts, monthLabel } from "../lib/date.ts";
import { BN_COPY, EN_COPY, getCopy } from "../lib/i18n.ts";
import { formatInteger, localizeDigits } from "../lib/locale.ts";
import { formatBdt } from "../lib/money.ts";

function assertCopyParity(english: unknown, bangla: unknown, path = "copy"): void {
  assert.equal(typeof bangla, typeof english, `${path}: both languages need the same value type`);

  if (typeof english === "string") {
    assert.ok(english.trim(), `${path}: English text must not be empty`);
    assert.ok((bangla as string).trim(), `${path}: Bangla text must not be empty`);
    return;
  }

  if (typeof english === "function") {
    assert.equal(
      (bangla as (...args: unknown[]) => unknown).length,
      english.length,
      `${path}: copy functions need the same arguments`,
    );
    return;
  }

  if (Array.isArray(english)) {
    assert.ok(Array.isArray(bangla), `${path}: both languages need an array`);
    assert.equal(bangla.length, english.length, `${path}: translated arrays need the same length`);
    english.forEach((item, index) => assertCopyParity(item, bangla[index], `${path}[${index}]`));
    return;
  }

  assert.ok(english !== null && typeof english === "object", `${path}: unexpected copy value`);
  assert.ok(bangla !== null && typeof bangla === "object", `${path}: missing translated object`);
  const englishRecord = english as Record<string, unknown>;
  const banglaRecord = bangla as Record<string, unknown>;
  assert.deepEqual(
    Object.keys(banglaRecord).sort(),
    Object.keys(englishRecord).sort(),
    `${path}: translated objects need the same keys`,
  );
  for (const key of Object.keys(englishRecord)) {
    assertCopyParity(englishRecord[key], banglaRecord[key], `${path}.${key}`);
  }
}

test("digit localization preserves punctuation and English digits", () => {
  assert.equal(localizeDigits("0123456789", "en"), "0123456789");
  assert.equal(localizeDigits("0123456789", "bn"), "০১২৩৪৫৬৭৮৯");
  assert.equal(localizeDigits("-৳1,234.05 / +5%", "bn"), "-৳১,২৩৪.০৫ / +৫%");
  assert.equal(localizeDigits(246, "bn"), "২৪৬");
  assert.equal(localizeDigits("১২৩", "bn"), "১২৩");
});

test("integer formatting uses each language's digits and grouping", () => {
  assert.equal(formatInteger(0, "en"), "0");
  assert.equal(formatInteger(0, "bn"), "০");
  assert.equal(formatInteger(1_234_567, "en"), "1,234,567");
  assert.equal(formatInteger(1_234_567, "bn"), "১২,৩৪,৫৬৭");
  assert.equal(formatInteger(-1_234, "bn"), "-১,২৩৪");
});

test("money formatting keeps paisa precision in English and Bangla", () => {
  assert.equal(formatBdt(123_456), "৳1,234.56");
  assert.equal(formatBdt(123_456, { language: "bn" }), "৳১,২৩৪.৫৬");
  assert.equal(formatBdt(5, { language: "en" }), "৳0.05");
  assert.equal(formatBdt(5, { language: "bn" }), "৳০.০৫");
  assert.equal(formatBdt(-105, { language: "en" }), "-৳1.05");
  assert.equal(formatBdt(-105, { language: "bn" }), "-৳১.০৫");
});

test("money signs and whole-taka rounding survive localization", () => {
  assert.equal(formatBdt(24_600, { sign: true, language: "en" }), "+৳246.00");
  assert.equal(formatBdt(24_600, { sign: true, language: "bn" }), "+৳২৪৬.০০");
  assert.equal(formatBdt(-24_600, { sign: true, language: "bn" }), "-৳২৪৬.০০");
  assert.equal(formatBdt(0, { sign: true, language: "bn" }), "৳০.০০");
  assert.equal(formatBdt(149, { decimals: false, language: "en" }), "৳1");
  assert.equal(formatBdt(150, { decimals: false, language: "bn" }), "৳২");
  assert.equal(formatBdt(-150, { decimals: false, language: "bn" }), "-৳২");
});

test("month labels translate the month and year without changing the date", () => {
  assert.equal(monthLabel("2026-01"), "Jan 2026");
  assert.equal(monthLabel("2026-01", "bn"), "জানু ২০২৬");
  assert.equal(monthLabel("2026-12", "en"), "Dec 2026");
  assert.equal(monthLabel("2026-12", "bn"), "ডিসে ২০২৬");
  assert.throws(() => monthLabel("2026-00", "bn"), /Invalid month/);
  assert.throws(() => monthLabel("2026-13", "en"), /Invalid month/);
});

test("date parts keep day separate and include the year only when requested", () => {
  assert.deepEqual(dateParts("2026-07-05"), { day: "5", monthYear: "Jul" });
  assert.deepEqual(dateParts("2026-07-05", { year: true }), {
    day: "5",
    monthYear: "Jul 2026",
  });
  assert.deepEqual(dateParts("2026-07-05", { language: "bn" }), {
    day: "৫",
    monthYear: "জুলাই",
  });
  assert.deepEqual(dateParts("2026-07-05", { year: true, language: "bn" }), {
    day: "৫",
    monthYear: "জুলাই ২০২৬",
  });
});

test("date labels handle leap days and reject invalid calendar dates in both languages", () => {
  assert.equal(dateLabel("2024-02-29"), "29 Feb");
  assert.equal(dateLabel("2024-02-29", { year: true, language: "bn" }), "২৯ ফেব ২০২৪");
  assert.equal(dateLabel("2026-12-31", { year: true, language: "en" }), "31 Dec 2026");
  assert.throws(() => dateLabel("2026-02-29", { language: "bn" }), /Invalid date/);
  assert.throws(() => dateParts("2026-13-01", { language: "en" }), /Invalid date/);
});

test("English and Bangla copy have matching keys, arrays, and function arguments", () => {
  assertCopyParity(EN_COPY, BN_COPY);
  assert.strictEqual(getCopy("en"), EN_COPY);
  assert.strictEqual(getCopy("bn"), BN_COPY);
});

test("fixed-charge difference copy uses the actual amount without assuming one month", () => {
  for (const language of ["en", "bn"] as const) {
    const copy = getCopy(language);
    for (const paisa of [8_200, 16_400, 24_600]) {
      const amount = formatBdt(paisa, { language });
      const explanation = copy.habits.differenceCopy(amount);
      assert.ok(explanation.includes(amount), `${language}: explanation must keep ${amount}`);
      assert.doesNotMatch(explanation, /\bone month\b|\b1 month\b|এক মাস|১ মাস/);
      assert.match(explanation, language === "en" ? /fixed charges/ : /নির্দিষ্ট চার্জ/);
    }
  }
});
