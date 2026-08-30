"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

import { BalanceChart } from "@/components/balance-chart";
import { dateLabel, daysBetween, monthLabel, monthOf } from "@/lib/date.ts";
import { parseFixtureJson } from "@/lib/fixture.ts";
import {
  calculateTargetRecharge,
  compareRechargeHabits,
  forecastRunOut,
  reconstructLedger,
} from "@/lib/ledger.ts";
import { bdtToPaisa, formatBdt } from "@/lib/money.ts";
import { slabPosition, TARIFF } from "@/lib/tariff.ts";
import type { Fixture, HouseholdCase } from "@/lib/types.ts";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path d="M5 12h13M14 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function SectionHeading({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <div className="section-heading">
      <span className="section-number">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="breakdown-row">
      <div>
        <strong>{label}</strong>
        <span>{note}</span>
      </div>
      <b>{formatBdt(value)}</b>
    </div>
  );
}

export function MeterDashboard({ fixture }: { fixture: Fixture }) {
  const [cases, setCases] = useState<HouseholdCase[]>(fixture.cases);
  const [selectedId, setSelectedId] = useState(fixture.cases[0].case_id);
  const [sourceLabel, setSourceLabel] = useState(`Official v${fixture.schema_version} fixture · 25 cases`);
  const [importError, setImportError] = useState("");
  const [targetDate, setTargetDate] = useState(fixture.cases[0].target_date);
  const fileInput = useRef<HTMLInputElement>(null);
  const household = cases.find((item) => item.case_id === selectedId) ?? cases[0];

  const results = useMemo(() => {
    const ledger = reconstructLedger(household);
    return {
      ledger,
      runOutDate: forecastRunOut(household, ledger),
      target: calculateTargetRecharge(household, ledger, targetDate),
      habits: compareRechargeHabits(household),
      slab: slabPosition(ledger.currentMonthUnits),
    };
  }, [household, targetDate]);

  const handleCaseChange = (caseId: string) => {
    const next = cases.find((item) => item.case_id === caseId);
    if (!next) return;
    setSelectedId(caseId);
    setTargetDate(next.target_date);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseFixtureJson(await file.text());
      setCases(imported);
      setSelectedId(imported[0].case_id);
      setTargetDate(imported[0].target_date);
      setSourceLabel(`${file.name} · ${imported.length} validated case${imported.length === 1 ? "" : "s"}`);
      setImportError("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not read that fixture");
    } finally {
      event.target.value = "";
    }
  };

  const restoreOfficial = () => {
    setCases(fixture.cases);
    setSelectedId(fixture.cases[0].case_id);
    setTargetDate(fixture.cases[0].target_date);
    setSourceLabel(`Official v${fixture.schema_version} fixture · 25 cases`);
    setImportError("");
  };

  const runOutDays = results.runOutDate
    ? daysBetween(household.today, results.runOutDate).length
    : null;
  const currentMonth = results.ledger.months.at(-1);
  const readingMonths = results.ledger.months.length;
  const peakMonth = [...results.ledger.months].sort((a, b) => b.units - a.units)[0];
  const lightMonth = [...results.ledger.months].sort((a, b) => a.units - b.units)[0];
  const largeLateRecharge = household.recharges
    .filter((item) => Number(item.date.slice(8)) >= 24)
    .sort((a, b) => bdtToPaisa(b.amount_bdt) - bdtToPaisa(a.amount_bdt))[0];
  const habitVerdict =
    results.habits.cheaper === "equal"
      ? "Both habits cost the same"
      : `${results.habits.cheaper === "low-balance" ? "Low-balance" : "Monthly"} costs less`;

  return (
    <main>
      <a className="skip-link" href="#ledger">Skip to ledger</a>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="KotoDin home">
          <span className="meter-glyph" aria-hidden="true"><i /></span>
          <span>KOTO<br />DIN?</span>
        </a>
        <div className="mast-meta">
          <span>Prepaid meter advisor</span>
          <span>LSH26-T028 · P10</span>
        </div>
        <nav aria-label="Page sections">
          <a href="#ledger">Ledger</a>
          <a href="#recharge">Recharge</a>
          <a href="#habits">Habits</a>
          <a href="#method">Method</a>
        </nav>
      </header>

      <div id="top" className="case-dock">
        <div className="case-control">
          <label htmlFor="case-select">Household case</label>
          <select id="case-select" value={selectedId} onChange={(event) => handleCaseChange(event.target.value)}>
            {cases.map((item) => <option key={item.case_id} value={item.case_id}>{item.case_id}</option>)}
          </select>
        </div>
        <div className="source-stamp">
          <span className="status-dot" />
          <div><small>DATA SOURCE</small><strong>{sourceLabel}</strong></div>
        </div>
        <div className="dock-actions">
          <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} />
          <button className="button ghost" type="button" onClick={() => fileInput.current?.click()}>
            <UploadIcon /> Load judge JSON
          </button>
          {cases !== fixture.cases ? <button className="text-button" onClick={restoreOfficial}>Restore samples</button> : null}
        </div>
        {importError ? <p className="import-error" role="alert">{importError}</p> : null}
      </div>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="kicker">Your balance, decoded</span>
          <h1 id="hero-title">Will the meter last?</h1>
          <p>
            Every taka traced through usage, slabs, VAT and recharges. No guesses, no invented
            savings.
          </p>
          <div className="hero-proof">
            <span><b>{readingMonths}</b> months rebuilt</span>
            <span><b>{household.days.length}</b> daily readings</span>
            <span><b>{household.recharges.length}</b> recharges marked</span>
          </div>
        </div>

        <div className={`runout-card ${results.ledger.currentBalancePaisa <= 0 ? "is-empty" : ""}`}>
          <div className="runout-topline"><span>At {household.usual_daily_units} units / day</span><i>LIVE MODEL</i></div>
          <div className="runout-date">
            {results.runOutDate ? (
              <>
                <span>{dateLabel(results.runOutDate).split(" ")[0]}</span>
                <strong>{dateLabel(results.runOutDate).split(" ").slice(1).join(" ")}</strong>
              </>
            ) : <strong>Beyond forecast</strong>}
          </div>
          <p>
            {runOutDays === 0 ? "The rebuilt balance is already at or below zero." : `${runOutDays} days after ${dateLabel(household.today)}.`}
          </p>
          <div className="balance-ticket">
            <span>Today’s rebuilt balance</span>
            <b>{formatBdt(results.ledger.currentBalancePaisa)}</b>
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Household data checks">
        <article>
          <span className="signal-index">A</span>
          <div><small>Light month</small><strong>{monthLabel(lightMonth.month)}</strong><p>{lightMonth.units} units</p></div>
        </article>
        <article>
          <span className="signal-index">B</span>
          <div><small>Heavy month</small><strong>{monthLabel(peakMonth.month)}</strong><p>{peakMonth.units} units</p></div>
        </article>
        <article>
          <span className="signal-index">C</span>
          <div><small>Late large recharge</small><strong>{largeLateRecharge ? dateLabel(largeLateRecharge.date) : "Not present"}</strong><p>{largeLateRecharge ? formatBdt(bdtToPaisa(largeLateRecharge.amount_bdt)) : "Fixture warning"}</p></div>
        </article>
        <article>
          <span className="signal-index">D</span>
          <div><small>{monthLabel(monthOf(household.today))} slab counter</small><strong>{results.ledger.currentMonthUnits} units</strong><p>{results.slab.unitsUntilNext === null ? "Highest slab" : `${results.slab.unitsUntilNext} to next slab`}</p></div>
        </article>
      </section>

      <section id="ledger" className="content-section ledger-section">
        <SectionHeading
          number="01"
          title="The daily money trail"
          copy="Recharge enters first. Monthly fixed charges apply once. Then that day’s progressive energy and VAT leave the meter."
        />
        <BalanceChart days={results.ledger.days} />

        <div className="monthly-table-wrap">
          <div className="table-heading">
            <h3>Month-by-month audit</h3>
            <p>Closing balance can be negative. The ledger keeps tracing actual history instead of hiding a shortfall.</p>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Month</th><th>Units</th><th>Deposited</th><th>Energy</th><th>VAT</th><th>Fixed</th><th>Closing</th></tr></thead>
              <tbody>
                {results.ledger.months.map((month) => (
                  <tr key={month.month}>
                    <th>{monthLabel(month.month)}</th>
                    <td>{month.units}</td>
                    <td className="positive-cell">{formatBdt(month.rechargePaisa)}</td>
                    <td>{formatBdt(month.energyPaisa)}</td>
                    <td>{formatBdt(month.vatPaisa)}</td>
                    <td>{formatBdt(month.fixedPaisa)}</td>
                    <td className={month.closingBalancePaisa < 0 ? "negative-cell" : ""}>{formatBdt(month.closingBalancePaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="recharge" className="content-section recharge-section">
        <SectionHeading
          number="02"
          title="How much should we recharge?"
          copy="Pick the date the household must reach. The answer uses today’s rebuilt balance and keeps the current calendar-month slab counter."
        />

        <div className="recharge-grid">
          <div className="target-panel">
            <label htmlFor="target-date">Make the balance last through</label>
            <input
              id="target-date"
              type="date"
              min={household.today}
              value={targetDate}
              onInput={(event) => setTargetDate(event.currentTarget.value || household.today)}
            />
            <div className="recommendation">
              <span>Recharge today</span>
              <strong>{formatBdt(results.target.rechargePaisa)}</strong>
              <p>
                Funds {results.target.units.toLocaleString("en-BD")} units across {results.target.days} days,
                through {dateLabel(results.target.targetDate, { year: true })}.
              </p>
            </div>
            <div className="formula-ribbon">
              <span>Projected charges</span><b>{formatBdt(results.target.projectedCostPaisa)}</b>
              <i>−</i>
              <span>Current balance</span><b>{formatBdt(results.ledger.currentBalancePaisa)}</b>
              <i>=</i>
              <span>Top-up</span><b>{formatBdt(results.target.rechargePaisa)}</b>
            </div>
          </div>

          <div className="breakdown-panel">
            <div className="breakdown-title"><span>Auditable breakdown</span><b>100%</b></div>
            <BreakdownRow label="Base energy" value={results.target.baseEnergyPaisa} note={`${results.target.units} units × first-slab rate`} />
            <BreakdownRow label="Higher-slab uplift" value={results.target.higherSlabPaisa} note="Only the amount above ৳4.63 per unit" />
            <BreakdownRow label="Fixed charges" value={results.target.fixedPaisa} note={results.target.fixedPaisa ? "Demand ৳42 + meter rent ৳40" : "Already paid this month or no top-up needed"} />
            <BreakdownRow label="VAT" value={results.target.vatPaisa} note="5% of energy only" />
            <div className="breakdown-total"><span>Total future cost</span><b>{formatBdt(results.target.projectedCostPaisa)}</b></div>
          </div>
        </div>
      </section>

      <section id="habits" className="content-section habits-section">
        <SectionHeading
          number="03"
          title="Recharge timing, honestly compared"
          copy="Both habits use the exact same daily consumption and slab counter. Only months that trigger the ৳82 first-recharge charge can change consumed cost."
        />

        <div className="verdict-card">
          <div>
            <span className="kicker">Three-month verdict</span>
            <h3>{habitVerdict}</h3>
            <p>
              {results.habits.cheaper === "equal"
                ? "That is a valid result. Timing changed cash deposits, not tariff rates or consumed energy."
                : `The difference is exactly ${formatBdt(results.habits.differencePaisa)}, one month of demand charge plus meter rent.`}
            </p>
          </div>
          <strong>{formatBdt(results.habits.differencePaisa)}</strong>
        </div>

        <div className="habit-grid">
          {[
            { title: "Low-balance", subtitle: `Top up below ${formatBdt(bdtToPaisa(household.comparison.low_threshold_bdt))}`, result: results.habits.lowBalance },
            { title: "Monthly", subtitle: "Top up on every month’s 1st", result: results.habits.monthly },
          ].map(({ title, subtitle, result }, index) => (
            <article className="habit-card" key={title}>
              <div className="habit-heading"><span>0{index + 1}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>
              <div className="habit-cost"><span>Money consumed</span><b>{formatBdt(result.consumedCostPaisa)}</b></div>
              <dl>
                <div><dt>Energy</dt><dd>{formatBdt(result.energyPaisa)}</dd></div>
                <div><dt>VAT</dt><dd>{formatBdt(result.vatPaisa)}</dd></div>
                <div><dt>Fixed charges</dt><dd>{formatBdt(result.fixedPaisa)}</dd></div>
                <div><dt>Recharge events</dt><dd>{result.rechargeCount}</dd></div>
                <div><dt>Money deposited</dt><dd>{formatBdt(result.depositedPaisa)}</dd></div>
                <div><dt>Closing balance</dt><dd>{formatBdt(result.closingBalancePaisa)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <div className="invariant-note">
          <span>ENERGY-COST CHECK</span>
          <strong>{formatBdt(results.habits.energyDifferencePaisa)} difference</strong>
          <p>Same units + same monthly slab counter = same energy cost. Any other answer fails clarification R-16.</p>
        </div>
      </section>

      <section id="method" className="content-section method-section">
        <SectionHeading
          number="04"
          title="The tariff, in the open"
          copy="The advisor uses the hackathon tariff only. A day that crosses a boundary is split progressively, and the counter resets on the first of each calendar month."
        />
        <div className="tariff-grid">
          {TARIFF.map((slab, index) => (
            <div className="tariff-cell" key={slab.from}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{slab.from}–{slab.to ?? "∞"} units</p>
              <strong>৳{(slab.ratePaisa / 100).toFixed(2)}</strong>
            </div>
          ))}
        </div>
        <div className="method-grid">
          <article><span>01</span><h3>Recharge first</h3><p>A recharge enters at the start of its date. The first recharge in a month also deducts ৳42 demand charge and ৳40 meter rent.</p></article>
          <article><span>02</span><h3>Price the units</h3><p>Daily units are split across the calendar month’s progressive slab boundaries. Recharge timing never resets this counter.</p></article>
          <article><span>03</span><h3>Add energy VAT</h3><p>VAT is 5% of that day’s energy charge, rounded to the nearest paisa. Fixed charges do not receive VAT.</p></article>
          <article><span>04</span><h3>Close the day</h3><p>Energy and VAT leave the meter. The first date at zero or below is the visible run-out date.</p></article>
        </div>
      </section>

      <footer>
        <div className="footer-mark"><span className="meter-glyph" aria-hidden="true"><i /></span><strong>KOTO DIN?</strong></div>
        <p>Built for GROCERYBOIX · LSH26-T028 · Problem P10</p>
        <a href="#top">Back to top <ArrowIcon /></a>
      </footer>
    </main>
  );
}
