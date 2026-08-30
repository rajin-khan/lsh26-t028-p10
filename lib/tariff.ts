export const TARIFF = [
  { from: 1, to: 75, ratePaisa: 463 },
  { from: 76, to: 200, ratePaisa: 526 },
  { from: 201, to: 300, ratePaisa: 563 },
  { from: 301, to: 400, ratePaisa: 583 },
  { from: 401, to: 600, ratePaisa: 930 },
  { from: 601, to: null, ratePaisa: 1070 },
] as const;

export const BASE_RATE_PAISA = TARIFF[0].ratePaisa;
export const DEMAND_CHARGE_PAISA = 4_200;
export const METER_RENT_PAISA = 4_000;
export const FIRST_RECHARGE_FIXED_PAISA = DEMAND_CHARGE_PAISA + METER_RENT_PAISA;

export type EnergyCharge = {
  energyPaisa: number;
  baseEnergyPaisa: number;
  higherSlabPaisa: number;
  vatPaisa: number;
  bands: Array<{ units: number; ratePaisa: number }>;
};

export function priceUnits(monthUnitsBefore: number, units: number): EnergyCharge {
  if (!Number.isInteger(monthUnitsBefore) || monthUnitsBefore < 0) {
    throw new Error("Monthly units must be a non-negative integer");
  }
  if (!Number.isInteger(units) || units < 0) {
    throw new Error("Daily units must be a non-negative integer");
  }

  let cursor = monthUnitsBefore;
  let remaining = units;
  let energyPaisa = 0;
  const bands: Array<{ units: number; ratePaisa: number }> = [];

  while (remaining > 0) {
    const slab = TARIFF.find(({ to }) => to === null || cursor < to);
    if (!slab) throw new Error("No tariff slab found");
    const available = slab.to === null ? remaining : Math.max(0, slab.to - cursor);
    const slabUnits = Math.min(remaining, available);
    energyPaisa += slabUnits * slab.ratePaisa;
    bands.push({ units: slabUnits, ratePaisa: slab.ratePaisa });
    remaining -= slabUnits;
    cursor += slabUnits;
  }

  const baseEnergyPaisa = units * BASE_RATE_PAISA;
  return {
    energyPaisa,
    baseEnergyPaisa,
    higherSlabPaisa: energyPaisa - baseEnergyPaisa,
    vatPaisa: Math.round(energyPaisa * 0.05),
    bands,
  };
}

export function slabPosition(monthUnits: number) {
  const slab = TARIFF.find(({ to }) => to === null || monthUnits < to) ?? TARIFF[TARIFF.length - 1];
  const nextBoundary = slab.to;
  return {
    ratePaisa: slab.ratePaisa,
    nextBoundary,
    unitsUntilNext: nextBoundary === null ? null : Math.max(0, nextBoundary - monthUnits),
  };
}
