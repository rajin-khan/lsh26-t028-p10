import { localizeDigits, type Language } from "./locale.ts";

const DAY_MS = 86_400_000;

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  bn: ["জানু", "ফেব", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগ", "সেপ্ট", "অক্ট", "নভে", "ডিসে"],
} satisfies Record<Language, string[]>;

export function parseDate(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (formatDate(value) !== date) throw new Error(`Invalid date: ${date}`);
  return value;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, amount: number): string {
  return formatDate(new Date(parseDate(date).getTime() + amount * DAY_MS));
}

export function daysBetween(startExclusive: string, endInclusive: string): string[] {
  const start = parseDate(startExclusive).getTime();
  const end = parseDate(endInclusive).getTime();
  if (end <= start) return [];
  const dates: string[] = [];
  for (let time = start + DAY_MS; time <= end; time += DAY_MS) {
    dates.push(formatDate(new Date(time)));
  }
  return dates;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function monthLabel(month: string, language: Language = "en"): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) throw new Error(`Invalid month: ${month}`);
  return `${MONTHS[language][Number(match[2]) - 1]} ${localizeDigits(match[1], language)}`;
}

export function dateLabel(date: string, options?: { year?: boolean; language?: Language }): string {
  const parts = dateParts(date, options);
  return `${parts.day} ${parts.monthYear}`;
}

export function dateParts(
  date: string,
  options?: { year?: boolean; language?: Language },
): { day: string; monthYear: string } {
  parseDate(date);
  const language = options?.language ?? "en";
  const year = date.slice(0, 4);
  const month = MONTHS[language][Number(date.slice(5, 7)) - 1];
  const day = String(Number(date.slice(8, 10)));
  return {
    day: localizeDigits(day, language),
    monthYear: `${month}${options?.year ? ` ${localizeDigits(year, language)}` : ""}`,
  };
}
