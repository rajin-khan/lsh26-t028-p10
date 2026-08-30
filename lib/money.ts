export function bdtToPaisa(value: string | number): number {
  const normalized = typeof value === "number" ? value.toFixed(2) : value.trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid BDT amount: ${String(value)}`);
  }
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [taka, decimals = ""] = unsigned.split(".");
  const paisa = Number(taka) * 100 + Number(decimals.padEnd(2, "0"));
  return negative ? -paisa : paisa;
}

export function formatBdt(paisa: number, options?: { sign?: boolean; decimals?: boolean }): string {
  const sign = options?.sign && paisa > 0 ? "+" : "";
  const absolute = Math.abs(paisa);
  const rounded = options?.decimals === false ? Math.round(absolute / 100) : Math.floor(absolute / 100);
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = options?.decimals === false ? "" : `.${String(absolute % 100).padStart(2, "0")}`;
  return `${paisa < 0 ? "-" : sign}৳${grouped}${fraction}`;
}
