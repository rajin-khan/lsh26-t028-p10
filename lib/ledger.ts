import { addDays, dayOfMonth, daysBetween, monthOf } from "./date.ts";
import { bdtToPaisa } from "./money.ts";
import {
  DEMAND_CHARGE_PAISA,
  FIRST_RECHARGE_FIXED_PAISA,
  METER_RENT_PAISA,
  priceUnits,
} from "./tariff.ts";
import type { HouseholdCase, Ledger, LedgerDay, MonthlySummary } from "./types.ts";

export function reconstructLedger(household: HouseholdCase): Ledger {
  const rechargeByDate = new Map<string, number>();
  for (const recharge of household.recharges) {
    rechargeByDate.set(
      recharge.date,
      (rechargeByDate.get(recharge.date) ?? 0) + bdtToPaisa(recharge.amount_bdt),
    );
  }

  let balancePaisa = bdtToPaisa(household.opening_balance_bdt);
  let activeMonth = "";
  let monthUnits = 0;
  const firstRechargeMonths = new Set<string>();
  const days: LedgerDay[] = [];
  const summaries = new Map<string, MonthlySummary>();

  for (const reading of household.days) {
    const month = monthOf(reading.date);
    if (month !== activeMonth) {
      activeMonth = month;
      monthUnits = 0;
    }

    const openingBalancePaisa = balancePaisa;
    const rechargePaisa = rechargeByDate.get(reading.date) ?? 0;
    balancePaisa += rechargePaisa;

    let demandChargePaisa = 0;
    let meterRentPaisa = 0;
    if (rechargePaisa > 0 && !firstRechargeMonths.has(month)) {
      firstRechargeMonths.add(month);
      demandChargePaisa = DEMAND_CHARGE_PAISA;
      meterRentPaisa = METER_RENT_PAISA;
      balancePaisa -= FIRST_RECHARGE_FIXED_PAISA;
    }

    const monthUnitsBefore = monthUnits;
    const energy = priceUnits(monthUnitsBefore, reading.units);
    monthUnits += reading.units;
    balancePaisa -= energy.energyPaisa + energy.vatPaisa;

    const day: LedgerDay = {
      date: reading.date,
      month,
      units: reading.units,
      monthUnitsBefore,
      monthUnitsAfter: monthUnits,
      openingBalancePaisa,
      rechargePaisa,
      demandChargePaisa,
      meterRentPaisa,
      energyPaisa: energy.energyPaisa,
      baseEnergyPaisa: energy.baseEnergyPaisa,
      higherSlabPaisa: energy.higherSlabPaisa,
      vatPaisa: energy.vatPaisa,
      closingBalancePaisa: balancePaisa,
      tariffBands: energy.bands,
    };
    days.push(day);

    const summary = summaries.get(month) ?? {
      month,
      units: 0,
      rechargePaisa: 0,
      energyPaisa: 0,
      higherSlabPaisa: 0,
      vatPaisa: 0,
      fixedPaisa: 0,
      closingBalancePaisa: balancePaisa,
    };
    summary.units += reading.units;
    summary.rechargePaisa += rechargePaisa;
    summary.energyPaisa += energy.energyPaisa;
    summary.higherSlabPaisa += energy.higherSlabPaisa;
    summary.vatPaisa += energy.vatPaisa;
    summary.fixedPaisa += demandChargePaisa + meterRentPaisa;
    summary.closingBalancePaisa = balancePaisa;
    summaries.set(month, summary);
  }

  const months = [...summaries.values()];
  return {
    days,
    months,
    currentBalancePaisa: balancePaisa,
    currentMonthUnits: monthUnits,
    firstRechargeMonths,
    totals: {
      rechargePaisa: months.reduce((sum, month) => sum + month.rechargePaisa, 0),
      energyPaisa: months.reduce((sum, month) => sum + month.energyPaisa, 0),
      higherSlabPaisa: months.reduce((sum, month) => sum + month.higherSlabPaisa, 0),
      vatPaisa: months.reduce((sum, month) => sum + month.vatPaisa, 0),
      fixedPaisa: months.reduce((sum, month) => sum + month.fixedPaisa, 0),
    },
  };
}

export function forecastRunOut(household: HouseholdCase, ledger: Ledger, maxDays = 3_650): string | null {
  if (ledger.currentBalancePaisa <= 0) return household.today;
  let balance = ledger.currentBalancePaisa;
  let date = household.today;
  let activeMonth = monthOf(household.today);
  let monthUnits = ledger.currentMonthUnits;

  for (let index = 0; index < maxDays; index += 1) {
    date = addDays(date, 1);
    const month = monthOf(date);
    if (month !== activeMonth) {
      activeMonth = month;
      monthUnits = 0;
    }
    const energy = priceUnits(monthUnits, household.usual_daily_units);
    monthUnits += household.usual_daily_units;
    balance -= energy.energyPaisa + energy.vatPaisa;
    if (balance <= 0) return date;
  }
  return null;
}

export type TargetRecharge = {
  targetDate: string;
  days: number;
  units: number;
  baseEnergyPaisa: number;
  higherSlabPaisa: number;
  energyPaisa: number;
  vatPaisa: number;
  fixedPaisa: number;
  projectedCostPaisa: number;
  balanceCreditPaisa: number;
  rechargePaisa: number;
};

export function calculateTargetRecharge(
  household: HouseholdCase,
  ledger: Ledger,
  targetDate: string,
): TargetRecharge {
  if (targetDate < household.today) {
    throw new Error("Target date cannot be before today");
  }
  const dates = daysBetween(household.today, targetDate);
  let activeMonth = monthOf(household.today);
  let monthUnits = ledger.currentMonthUnits;
  let baseEnergyPaisa = 0;
  let higherSlabPaisa = 0;
  let energyPaisa = 0;
  let vatPaisa = 0;

  for (const date of dates) {
    const month = monthOf(date);
    if (month !== activeMonth) {
      activeMonth = month;
      monthUnits = 0;
    }
    const charge = priceUnits(monthUnits, household.usual_daily_units);
    monthUnits += household.usual_daily_units;
    baseEnergyPaisa += charge.baseEnergyPaisa;
    higherSlabPaisa += charge.higherSlabPaisa;
    energyPaisa += charge.energyPaisa;
    vatPaisa += charge.vatPaisa;
  }

  const futureEnergyCost = energyPaisa + vatPaisa;
  const shortfallBeforeFixed = futureEnergyCost - ledger.currentBalancePaisa;
  const todayMonth = monthOf(household.today);
  const triggersFirstRecharge = shortfallBeforeFixed > 0 && !ledger.firstRechargeMonths.has(todayMonth);
  const fixedPaisa = triggersFirstRecharge ? FIRST_RECHARGE_FIXED_PAISA : 0;
  const projectedCostPaisa = futureEnergyCost + fixedPaisa;
  const rechargePaisa = Math.max(0, projectedCostPaisa - ledger.currentBalancePaisa);

  return {
    targetDate,
    days: dates.length,
    units: dates.length * household.usual_daily_units,
    baseEnergyPaisa,
    higherSlabPaisa,
    energyPaisa,
    vatPaisa,
    fixedPaisa,
    projectedCostPaisa,
    balanceCreditPaisa: Math.max(0, ledger.currentBalancePaisa),
    rechargePaisa,
  };
}

type HabitResult = {
  label: "low-balance" | "monthly";
  consumedCostPaisa: number;
  energyPaisa: number;
  vatPaisa: number;
  fixedPaisa: number;
  depositedPaisa: number;
  rechargeCount: number;
  fixedMonths: string[];
  closingBalancePaisa: number;
};

export type HabitComparison = {
  months: [string, string, string];
  lowBalance: HabitResult;
  monthly: HabitResult;
  differencePaisa: number;
  cheaper: "low-balance" | "monthly" | "equal";
  energyDifferencePaisa: number;
};

export function compareRechargeHabits(household: HouseholdCase): HabitComparison {
  const included = new Set(household.comparison.months);
  const readings = household.days.filter((day) => included.has(monthOf(day.date)));
  if (readings.length === 0) throw new Error("Comparison months have no readings");

  const simulate = (policy: "low-balance" | "monthly"): HabitResult => {
    let balance = bdtToPaisa(household.comparison.opening_balance_bdt);
    let activeMonth = "";
    let monthUnits = 0;
    let energyPaisa = 0;
    let vatPaisa = 0;
    let fixedPaisa = 0;
    let depositedPaisa = 0;
    let rechargeCount = 0;
    const fixedMonths = new Set<string>();

    for (const reading of readings) {
      const month = monthOf(reading.date);
      if (month !== activeMonth) {
        activeMonth = month;
        monthUnits = 0;
      }

      const shouldRecharge =
        policy === "monthly"
          ? dayOfMonth(reading.date) === 1
          : balance < bdtToPaisa(household.comparison.low_threshold_bdt);
      if (shouldRecharge) {
        const amount = bdtToPaisa(
          policy === "monthly"
            ? household.comparison.monthly_amount_bdt
            : household.comparison.low_amount_bdt,
        );
        balance += amount;
        depositedPaisa += amount;
        rechargeCount += 1;
        if (!fixedMonths.has(month)) {
          fixedMonths.add(month);
          fixedPaisa += FIRST_RECHARGE_FIXED_PAISA;
          balance -= FIRST_RECHARGE_FIXED_PAISA;
        }
      }

      const charge = priceUnits(monthUnits, reading.units);
      monthUnits += reading.units;
      energyPaisa += charge.energyPaisa;
      vatPaisa += charge.vatPaisa;
      balance -= charge.energyPaisa + charge.vatPaisa;
    }

    return {
      label: policy,
      consumedCostPaisa: energyPaisa + vatPaisa + fixedPaisa,
      energyPaisa,
      vatPaisa,
      fixedPaisa,
      depositedPaisa,
      rechargeCount,
      fixedMonths: [...fixedMonths],
      closingBalancePaisa: balance,
    };
  };

  const lowBalance = simulate("low-balance");
  const monthly = simulate("monthly");
  const differencePaisa = Math.abs(lowBalance.consumedCostPaisa - monthly.consumedCostPaisa);
  const cheaper =
    lowBalance.consumedCostPaisa === monthly.consumedCostPaisa
      ? "equal"
      : lowBalance.consumedCostPaisa < monthly.consumedCostPaisa
        ? "low-balance"
        : "monthly";

  return {
    months: household.comparison.months,
    lowBalance,
    monthly,
    differencePaisa,
    cheaper,
    energyDifferencePaisa: Math.abs(lowBalance.energyPaisa - monthly.energyPaisa),
  };
}
