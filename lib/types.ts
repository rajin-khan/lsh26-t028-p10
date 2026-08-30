export type DailyReading = {
  date: string;
  units: number;
};

export type Recharge = {
  date: string;
  amount_bdt: string;
};

export type ComparisonInput = {
  months: [string, string, string];
  source: "readings";
  daily_units: null;
  opening_balance_bdt: string;
  low_threshold_bdt: string;
  low_amount_bdt: string;
  monthly_amount_bdt: string;
};

export type HouseholdCase = {
  case_id: string;
  opening_balance_bdt: string;
  days: DailyReading[];
  recharges: Recharge[];
  today: string;
  usual_daily_units: number;
  target_date: string;
  comparison: ComparisonInput;
};

export type Fixture = {
  schema_version: string;
  problem_id: "P10";
  format_note: string;
  cases: HouseholdCase[];
};

export type LedgerDay = {
  date: string;
  month: string;
  units: number;
  monthUnitsBefore: number;
  monthUnitsAfter: number;
  openingBalancePaisa: number;
  rechargePaisa: number;
  demandChargePaisa: number;
  meterRentPaisa: number;
  energyPaisa: number;
  baseEnergyPaisa: number;
  higherSlabPaisa: number;
  vatPaisa: number;
  closingBalancePaisa: number;
  tariffBands: Array<{ units: number; ratePaisa: number }>;
};

export type MonthlySummary = {
  month: string;
  units: number;
  rechargePaisa: number;
  energyPaisa: number;
  higherSlabPaisa: number;
  vatPaisa: number;
  fixedPaisa: number;
  closingBalancePaisa: number;
};

export type Ledger = {
  days: LedgerDay[];
  months: MonthlySummary[];
  currentBalancePaisa: number;
  currentMonthUnits: number;
  firstRechargeMonths: Set<string>;
  totals: {
    rechargePaisa: number;
    energyPaisa: number;
    higherSlabPaisa: number;
    vatPaisa: number;
    fixedPaisa: number;
  };
};
