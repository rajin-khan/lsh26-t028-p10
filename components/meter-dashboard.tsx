"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { BalanceChart } from "@/components/balance-chart";
import { dateLabel, dateParts, daysBetween, monthLabel, monthOf, parseDate } from "@/lib/date.ts";
import { parseFixtureJson } from "@/lib/fixture.ts";
import { formatFixtureError } from "@/lib/fixture-errors.ts";
import { getCopy } from "@/lib/i18n.ts";
import {
  calculateTargetRecharge,
  compareRechargeHabits,
  forecastRunOut,
  reconstructLedger,
} from "@/lib/ledger.ts";
import { formatInteger, localizeDigits, type Language } from "@/lib/locale.ts";
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
      <span className="section-number" aria-hidden="true">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  note,
  language,
}: {
  label: string;
  value: number;
  note: string;
  language: Language;
}) {
  return (
    <div className="breakdown-row">
      <div>
        <strong>{label}</strong>
        <span>{note}</span>
      </div>
      <b>{formatBdt(value, { language })}</b>
    </div>
  );
}

function isValidTargetDate(value: string, today: string): boolean {
  if (!value || value < today) return false;
  try {
    parseDate(value);
    return true;
  } catch {
    return false;
  }
}

export function MeterDashboard({ fixture }: { fixture: Fixture }) {
  const [language, setLanguage] = useState<Language>("en");
  const [cases, setCases] = useState<HouseholdCase[]>(fixture.cases);
  const [selectedId, setSelectedId] = useState(fixture.cases[0].case_id);
  const [source, setSource] = useState<{ kind: "official" } | { kind: "import"; file: string; count: number }>({ kind: "official" });
  const [importError, setImportError] = useState<unknown | null>(null);
  const [targetDateWasReset, setTargetDateWasReset] = useState(false);
  const [targetDate, setTargetDate] = useState(fixture.cases[0].target_date);
  const [targetDraft, setTargetDraft] = useState(fixture.cases[0].target_date);
  const [dataRevision, setDataRevision] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const household = cases.find((item) => item.case_id === selectedId) ?? cases[0];
  const targetDraftIsInvalid = !isValidTargetDate(targetDraft, household.today);
  const copy = getCopy(language);
  const number = (value: number) => formatInteger(value, language);
  const money = (value: number, options?: { sign?: boolean; decimals?: boolean }) =>
    formatBdt(value, { ...options, language });
  const date = (value: string, year = false) => dateLabel(value, { year, language });
  const month = (value: string) => monthLabel(value, language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
    setTargetDraft(next.target_date);
    setTargetDateWasReset(false);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseFixtureJson(await file.text());
      setCases(imported);
      setSelectedId(imported[0].case_id);
      setTargetDate(imported[0].target_date);
      setTargetDraft(imported[0].target_date);
      setTargetDateWasReset(false);
      setSource({ kind: "import", file: file.name, count: imported.length });
      setDataRevision((revision) => revision + 1);
      setImportError(null);
    } catch (error) {
      setImportError(error);
    } finally {
      event.target.value = "";
    }
  };

  const restoreOfficial = () => {
    setCases(fixture.cases);
    setSelectedId(fixture.cases[0].case_id);
    setTargetDate(fixture.cases[0].target_date);
    setTargetDraft(fixture.cases[0].target_date);
    setTargetDateWasReset(false);
    setSource({ kind: "official" });
    setDataRevision((revision) => revision + 1);
    setImportError(null);
  };

  const runOutDays = results.runOutDate
    ? daysBetween(household.today, results.runOutDate).length
    : null;
  const readingMonths = results.ledger.months.length;
  const peakMonth = [...results.ledger.months].sort((a, b) => b.units - a.units)[0];
  const lightMonth = [...results.ledger.months].sort((a, b) => a.units - b.units)[0];
  const largeLateRecharge = household.recharges
    .filter((item) => Number(item.date.slice(8)) >= 24)
    .sort((a, b) => bdtToPaisa(b.amount_bdt) - bdtToPaisa(a.amount_bdt))[0];
  const habitVerdict = results.habits.cheaper === "equal"
    ? copy.habits.equal
    : results.habits.cheaper === "low-balance"
      ? copy.habits.lowCheaper
      : copy.habits.monthlyCheaper;
  const sourceLabel = source.kind === "official"
    ? copy.caseDock.official(fixture.schema_version, number(fixture.cases.length))
    : copy.caseDock.imported(source.file, number(source.count));
  const runOutParts = results.runOutDate
    ? dateParts(results.runOutDate, { language, year: true })
    : null;
  const runOutCopy = runOutDays === 0
    ? copy.hero.empty
    : runOutDays === null
      ? copy.hero.noRunOut
      : copy.hero.daysAfter(number(runOutDays), date(household.today));

  return (
    <main>
      <a className="skip-link" href="#ledger">{copy.skip}</a>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label={copy.homeLabel}>
          <span className="meter-glyph" aria-hidden="true"><i /></span>
          <span>KOTO<br />DIN?</span>
        </a>
        <div className="mast-meta">
          <span>{copy.product}</span>
          <span>LSH26-T028, P10</span>
        </div>
        <nav aria-label={copy.navLabel}>
          <a href="#ledger">{copy.nav.ledger}</a>
          <a href="#recharge">{copy.nav.recharge}</a>
          <a href="#habits">{copy.nav.habits}</a>
          <a href="#method">{copy.nav.method}</a>
        </nav>
        <div className="language-switch" role="group" aria-label="Language / ভাষা">
          <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>English</button>
          <button type="button" lang="bn" aria-pressed={language === "bn"} onClick={() => setLanguage("bn")}>বাংলা</button>
        </div>
      </header>

      <div id="top" className="case-dock">
        <div className="case-control">
          <label htmlFor="case-select">{copy.caseDock.household}</label>
          <select id="case-select" value={selectedId} onChange={(event) => handleCaseChange(event.target.value)}>
            {cases.map((item) => <option key={item.case_id} value={item.case_id}>{item.case_id}</option>)}
          </select>
        </div>
        <div className="source-stamp" aria-live="polite">
          <span className="status-dot" aria-hidden="true" />
          <div><small>{copy.caseDock.source}</small><strong>{sourceLabel}</strong></div>
        </div>
        <div className="dock-actions">
          <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" tabIndex={-1} aria-label={copy.caseDock.load} onChange={handleImport} />
          <button className="button ghost" type="button" onClick={() => fileInput.current?.click()}>
            <UploadIcon /> {copy.caseDock.load}
          </button>
          {cases !== fixture.cases ? <button className="text-button" type="button" onClick={restoreOfficial}>{copy.caseDock.restore}</button> : null}
        </div>
        {importError !== null ? <p className="import-error" role="alert">{copy.caseDock.importFailed(formatFixtureError(importError, language))}</p> : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {household.case_id}. {copy.hero.readings(number(household.days.length))}. {copy.hero.recharges(number(household.recharges.length))}.
      </p>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="kicker">{copy.hero.kicker}</span>
          <h1 id="hero-title">{copy.hero.title}</h1>
          <p>{copy.hero.copy}</p>
          <div className="hero-proof">
            <span>{copy.hero.monthsRebuilt(number(readingMonths))}</span>
            <span>{copy.hero.readings(number(household.days.length))}</span>
            <span>{copy.hero.recharges(number(household.recharges.length))}</span>
          </div>
        </div>

        <div className={`runout-card ${results.ledger.currentBalancePaisa <= 0 ? "is-empty" : ""}`}>
          <div className="runout-topline"><span>{copy.hero.atUsage(number(household.usual_daily_units))}</span><i>{copy.hero.liveModel}</i></div>
          <div className="runout-date">
            {runOutParts ? (
              <>
                <span>{runOutParts.day}</span>
                <strong>{runOutParts.monthYear}</strong>
              </>
            ) : <strong>{copy.hero.beyond}</strong>}
          </div>
          <p>{runOutCopy}</p>
          <div className="balance-ticket">
            <span>{copy.hero.todayBalance}</span>
            <b>{money(results.ledger.currentBalancePaisa)}</b>
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label={copy.signals.label}>
        <article>
          <span className="signal-index" aria-hidden="true">A</span>
          <div><small>{copy.signals.light}</small><strong>{month(lightMonth.month)}</strong><p>{copy.signals.units(number(lightMonth.units))}</p></div>
        </article>
        <article>
          <span className="signal-index" aria-hidden="true">B</span>
          <div><small>{copy.signals.heavy}</small><strong>{month(peakMonth.month)}</strong><p>{copy.signals.units(number(peakMonth.units))}</p></div>
        </article>
        <article>
          <span className="signal-index" aria-hidden="true">C</span>
          <div><small>{copy.signals.late}</small><strong>{largeLateRecharge ? date(largeLateRecharge.date) : copy.signals.none}</strong><p>{largeLateRecharge ? money(bdtToPaisa(largeLateRecharge.amount_bdt)) : copy.signals.noLate}</p></div>
        </article>
        <article>
          <span className="signal-index" aria-hidden="true">D</span>
          <div><small>{copy.signals.slabCounter(month(monthOf(household.today)))}</small><strong>{copy.signals.units(number(results.ledger.currentMonthUnits))}</strong><p>{results.slab.unitsUntilNext === null ? copy.signals.highest : copy.signals.toNext(number(results.slab.unitsUntilNext))}</p></div>
        </article>
      </section>

      <section id="ledger" className="content-section ledger-section">
        <SectionHeading
          number={localizeDigits("01", language)}
          title={copy.ledger.title}
          copy={copy.ledger.copy}
        />
        <BalanceChart
          days={results.ledger.days}
          language={language}
          copy={copy.chart}
          datasetKey={`${dataRevision}:${household.case_id}:${household.today}:${household.days.length}`}
        />

        <div className="monthly-table-wrap">
          <div className="table-heading">
            <h3>{copy.ledger.auditTitle}</h3>
            <p>{copy.ledger.auditCopy}</p>
            <span id="monthly-table-cue" className="table-scroll-cue">{copy.ledger.scrollCue}</span>
          </div>
          <div className="table-scroll" role="region" aria-label={copy.ledger.regionLabel} aria-describedby="monthly-table-cue" tabIndex={0}>
            <table>
              <caption className="sr-only">{copy.ledger.caption}</caption>
              <thead><tr>{copy.ledger.headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
              <tbody>
                {results.ledger.months.map((month) => (
                  <tr key={month.month}>
                    <th scope="row">{monthLabel(month.month, language)}</th>
                    <td>{number(month.units)}</td>
                    <td className="positive-cell">{money(month.rechargePaisa)}</td>
                    <td>{money(month.energyPaisa)}</td>
                    <td>{money(month.vatPaisa)}</td>
                    <td>{money(month.fixedPaisa)}</td>
                    <td className={month.closingBalancePaisa < 0 ? "negative-cell" : ""}>{money(month.closingBalancePaisa)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="recharge" className="content-section recharge-section">
        <SectionHeading
          number={localizeDigits("02", language)}
          title={copy.recharge.title}
          copy={copy.recharge.copy}
        />

        <div className="recharge-grid">
          <div className="target-panel">
            <label htmlFor="target-date">{copy.recharge.dateLabel}</label>
            <input
              id="target-date"
              type="date"
              min={household.today}
              max="9999-12-31"
              value={targetDraft}
              aria-invalid={targetDraftIsInvalid || undefined}
              aria-describedby={targetDraftIsInvalid || targetDateWasReset ? "target-date-feedback" : undefined}
              onInput={(event) => {
                const nextDate = event.currentTarget.value;
                setTargetDraft(nextDate);
                setTargetDateWasReset(false);
                if (isValidTargetDate(nextDate, household.today)) setTargetDate(nextDate);
              }}
              onBlur={(event) => {
                const nextDate = event.currentTarget.value;
                if (!isValidTargetDate(nextDate, household.today)) {
                  setTargetDraft(household.today);
                  setTargetDate(household.today);
                  setTargetDateWasReset(true);
                  return;
                }
                setTargetDraft(nextDate);
                setTargetDate(nextDate);
                setTargetDateWasReset(false);
              }}
            />
            {targetDraftIsInvalid ? (
              <p id="target-date-feedback" className="target-date-notice" role="status">
                {copy.recharge.editing(date(household.today, true), date(targetDate, true))}
              </p>
            ) : targetDateWasReset ? (
              <p id="target-date-feedback" className="target-date-notice" role="alert">
                {copy.recharge.reset(date(household.today, true))}
              </p>
            ) : null}
            <div className="recommendation">
              <span>{copy.recharge.amountLabel}</span>
              <output htmlFor="target-date" aria-live="polite">{money(results.target.rechargePaisa)}</output>
              <p>
                {copy.recharge.funds(
                  number(results.target.units),
                  number(results.target.days),
                  date(results.target.targetDate, true),
                )}
              </p>
            </div>
            <div className="formula-ribbon">
              <span>{copy.recharge.projected}</span><b>{money(results.target.projectedCostPaisa)}</b>
              <i>−</i>
              <span>{copy.recharge.current}</span><b>{money(results.ledger.currentBalancePaisa)}</b>
              <i aria-hidden="true">→</i>
              <span>{copy.recharge.topUp}</span><b>{money(results.target.rechargePaisa)}</b>
            </div>
            <p className="formula-note">{copy.recharge.floorNote}</p>
          </div>

          <div className="breakdown-panel">
            <div className="breakdown-title"><span>{copy.recharge.breakdown}</span><b>{localizeDigits("100%", language)}</b></div>
            <BreakdownRow language={language} label={copy.recharge.base} value={results.target.baseEnergyPaisa} note={copy.recharge.baseNote(number(results.target.units))} />
            <BreakdownRow language={language} label={copy.recharge.uplift} value={results.target.higherSlabPaisa} note={copy.recharge.upliftNote} />
            <BreakdownRow language={language} label={copy.recharge.fixed} value={results.target.fixedPaisa} note={results.target.fixedPaisa ? copy.recharge.fixedDue : copy.recharge.fixedPaid} />
            <BreakdownRow language={language} label={copy.recharge.vat} value={results.target.vatPaisa} note={copy.recharge.vatNote} />
            <div className="breakdown-total"><span>{copy.recharge.total}</span><b>{money(results.target.projectedCostPaisa)}</b></div>
          </div>
        </div>
      </section>

      <section id="habits" className="content-section habits-section">
        <SectionHeading
          number={localizeDigits("03", language)}
          title={copy.habits.title}
          copy={copy.habits.copy}
        />

        <div className="verdict-card" aria-live="polite">
          <div>
            <span className="kicker">{copy.habits.verdict}</span>
            <h3>{habitVerdict}</h3>
            <p>
              {results.habits.cheaper === "equal"
                ? copy.habits.equalCopy
                : copy.habits.differenceCopy(money(results.habits.differencePaisa))}
            </p>
          </div>
          <strong>{money(results.habits.differencePaisa)}</strong>
        </div>

        <div className="habit-grid">
          {[
            { title: copy.habits.low, subtitle: copy.habits.lowSubtitle(money(bdtToPaisa(household.comparison.low_threshold_bdt))), result: results.habits.lowBalance },
            { title: copy.habits.monthly, subtitle: copy.habits.monthlySubtitle, result: results.habits.monthly },
          ].map(({ title, subtitle, result }, index) => (
            <article className="habit-card" key={title}>
              <div className="habit-heading"><span aria-hidden="true">{localizeDigits(`0${index + 1}`, language)}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>
              <div className="habit-cost"><span>{copy.habits.consumed}</span><b>{money(result.consumedCostPaisa)}</b></div>
              <dl>
                <div><dt>{copy.habits.energy}</dt><dd>{money(result.energyPaisa)}</dd></div>
                <div><dt>{copy.habits.vat}</dt><dd>{money(result.vatPaisa)}</dd></div>
                <div><dt>{copy.habits.fixed}</dt><dd>{money(result.fixedPaisa)}</dd></div>
                <div><dt>{copy.habits.events}</dt><dd>{number(result.rechargeCount)}</dd></div>
                <div><dt>{copy.habits.deposited}</dt><dd>{money(result.depositedPaisa)}</dd></div>
                <div><dt>{copy.habits.closing}</dt><dd>{money(result.closingBalancePaisa)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        <div className="invariant-note">
          <span>{copy.habits.check}</span>
          <strong>{copy.habits.difference(money(results.habits.energyDifferencePaisa))}</strong>
          <p>{copy.habits.invariant}</p>
        </div>
      </section>

      <section id="method" className="content-section method-section">
        <SectionHeading
          number={localizeDigits("04", language)}
          title={copy.method.title}
          copy={copy.method.copy}
        />
        <div className="tariff-grid">
          {TARIFF.map((slab, index) => (
            <div className="tariff-cell" key={slab.from}>
              <span aria-hidden="true">{localizeDigits(String(index + 1).padStart(2, "0"), language)}</span>
              <p>{copy.method.unitRange(number(slab.from), slab.to === null ? "∞" : number(slab.to))}</p>
              <strong>{money(slab.ratePaisa)}</strong>
            </div>
          ))}
        </div>
        <div className="method-grid">
          {copy.method.steps.map((step, index) => (
            <article key={step.title}>
              <span>{localizeDigits(String(index + 1).padStart(2, "0"), language)}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-mark"><span className="meter-glyph" aria-hidden="true"><i /></span><strong>KOTO DIN?</strong></div>
        <p>{copy.footer.builtFor}</p>
        <a href="#top">{copy.footer.back} <ArrowIcon /></a>
      </footer>
    </main>
  );
}
