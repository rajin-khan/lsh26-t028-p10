import { localizeDigits, type Language } from "./locale.ts";
import { FixtureValidationError } from "./fixture-errors.ts";

export function bdtToPaisa(value: string | number): number {
  const normalized = typeof value === "number" ? value.toFixed(2) : value.trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new FixtureValidationError("invalid_amount", `Invalid BDT amount: ${String(value)}`, {
      value: String(value),
    });
  }
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [taka, decimals = ""] = unsigned.split(".");
  const paisa = BigInt(taka) * 100n + BigInt(decimals.padEnd(2, "0"));
  if (paisa > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new FixtureValidationError(
      "unsafe_amount",
      `BDT amount exceeds the safe integer-paisa range: ${String(value)}`,
      { value: String(value) },
    );
  }
  return negative ? -Number(paisa) : Number(paisa);
}

export function formatBdt(
  paisa: number,
  options?: { sign?: boolean; decimals?: boolean; language?: Language },
): string {
  const sign = options?.sign && paisa > 0 ? "+" : "";
  const absolute = Math.abs(paisa);
  const rounded = options?.decimals === false ? Math.round(absolute / 100) : Math.floor(absolute / 100);
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = options?.decimals === false ? "" : `.${String(absolute % 100).padStart(2, "0")}`;
  return localizeDigits(`${paisa < 0 ? "-" : sign}৳${grouped}${fraction}`, options?.language ?? "en");
}
