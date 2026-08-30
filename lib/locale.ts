export type Language = "en" | "bn";

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function localizeDigits(value: string | number, language: Language): string {
  const text = String(value);
  if (language === "en") return text;
  return text.replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)]);
}

export function formatInteger(value: number, language: Language): string {
  return value.toLocaleString(language === "bn" ? "bn-BD" : "en-BD");
}
