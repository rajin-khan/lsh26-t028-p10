"use client";

import { useEffect, useMemo, useState } from "react";

import { dateLabel, monthLabel } from "@/lib/date.ts";
import type { ChartCopy } from "@/lib/i18n.ts";
import { formatInteger, type Language } from "@/lib/locale.ts";
import { formatBdt } from "@/lib/money.ts";
import type { LedgerDay } from "@/lib/types.ts";

const WIDTH = 1_200;
const HEIGHT = 360;
const MARGIN = { top: 30, right: 28, bottom: 48, left: 72 };

function niceBounds(values: number[]) {
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const range = Math.max(10_000, rawMax - rawMin);
  const padding = range * 0.12;
  return { min: rawMin - padding, max: rawMax + padding };
}

export function BalanceChart({
  days,
  language,
  copy,
  datasetKey,
}: {
  days: LedgerDay[];
  language: Language;
  copy: ChartCopy;
  datasetKey: string;
}) {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, days.length - 1));
  const safeIndex = Math.min(activeIndex, Math.max(0, days.length - 1));
  const active = days[safeIndex];

  useEffect(() => {
    setActiveIndex(Math.max(0, days.length - 1));
  }, [datasetKey, days.length]);

  const plot = useMemo(() => {
    const balances = days.map((day) => day.closingBalancePaisa);
    const { min, max } = niceBounds(balances);
    const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const x = (index: number) => MARGIN.left + (index / Math.max(1, days.length - 1)) * innerWidth;
    const y = (value: number) => MARGIN.top + ((max - value) / Math.max(1, max - min)) * innerHeight;
    const points = balances.map((value, index) => `${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");
    const area = `${MARGIN.left},${y(0)} ${points} ${x(days.length - 1)},${y(0)}`;
    const monthStarts = days
      .map((day, index) => ({ day, index }))
      .filter(({ day, index }) => index === 0 || day.month !== days[index - 1].month);
    return { min, max, x, y, points, area, monthStarts };
  }, [days]);

  if (!active) return null;

  return (
    <div className="chart-shell">
      <div className="chart-readout" aria-live="polite">
        <div>
          <span className="eyebrow">{copy.selected}</span>
          <strong>{dateLabel(active.date, { year: true, language })}</strong>
        </div>
        <div>
          <span className="eyebrow">{copy.closing}</span>
          <strong className={active.closingBalancePaisa < 0 ? "danger-text" : ""}>
            {formatBdt(active.closingBalancePaisa, { language })}
          </strong>
        </div>
        <div>
          <span className="eyebrow">{copy.used}</span>
          <strong>
            {copy.unitsAndCharge(
              formatInteger(active.units, language),
              formatBdt(active.energyPaisa + active.vatPaisa, { language }),
            )}
          </strong>
        </div>
        <div>
          <span className="eyebrow">{copy.recharge}</span>
          <strong>
            {active.rechargePaisa
              ? formatBdt(active.rechargePaisa, { sign: true, language })
              : copy.none}
          </strong>
        </div>
      </div>

      <p id="chart-scroll-cue" className="chart-scroll-cue">{copy.scrollCue}</p>
      <div
        className="chart-scroll"
        role="region"
        aria-label={copy.regionLabel}
        aria-describedby="chart-scroll-cue"
        tabIndex={0}
      >
        <svg
          className="balance-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={copy.imageLabel}
        >
          <defs>
            <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--chart-fill)" stopOpacity="0.26" />
              <stop offset="1" stopColor="var(--chart-fill)" stopOpacity="0" />
            </linearGradient>
            <pattern id="chart-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.42" />
            </pattern>
          </defs>

          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={WIDTH - MARGIN.left - MARGIN.right}
            height={HEIGHT - MARGIN.top - MARGIN.bottom}
            fill="url(#chart-grid)"
          />
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={plot.y(0)}
            y2={plot.y(0)}
            className="zero-line"
          />
          <text x={MARGIN.left - 12} y={plot.y(0) + 4} textAnchor="end" className="axis-label">
            {formatBdt(0, { decimals: false, language })}
          </text>
          <text x={MARGIN.left - 12} y={MARGIN.top + 4} textAnchor="end" className="axis-label">
            {formatBdt(plot.max, { decimals: false, language })}
          </text>
          <text x={MARGIN.left - 12} y={HEIGHT - MARGIN.bottom} textAnchor="end" className="axis-label">
            {formatBdt(plot.min, { decimals: false, language })}
          </text>

          {plot.monthStarts.map(({ day, index }) => (
            <g key={day.month}>
              <line
                x1={plot.x(index)}
                x2={plot.x(index)}
                y1={MARGIN.top}
                y2={HEIGHT - MARGIN.bottom}
                className="month-line"
              />
              <text x={plot.x(index) + 8} y={HEIGHT - 18} className="month-label">
                {monthLabel(day.month, language).split(" ")[0]}
              </text>
            </g>
          ))}

          <polygon points={plot.area} fill="url(#balance-fill)" />
          <polyline points={plot.points} className="balance-line" />

          {days.map((day, index) =>
            day.rechargePaisa > 0 ? (
              <g key={`recharge-${day.date}`}>
                <line
                  x1={plot.x(index)}
                  x2={plot.x(index)}
                  y1={MARGIN.top}
                  y2={plot.y(day.closingBalancePaisa)}
                  className="recharge-stem"
                />
                <circle
                  cx={plot.x(index)}
                  cy={plot.y(day.closingBalancePaisa)}
                  r="5.5"
                  className="recharge-dot"
                  role="img"
                  aria-label={copy.rechargeMarker(
                    dateLabel(day.date, { year: true, language }),
                    formatBdt(day.rechargePaisa, { language }),
                  )}
                />
              </g>
            ) : null,
          )}

          <line
            x1={plot.x(safeIndex)}
            x2={plot.x(safeIndex)}
            y1={MARGIN.top}
            y2={HEIGHT - MARGIN.bottom}
            className="active-line"
          />
          <circle
            cx={plot.x(safeIndex)}
            cy={plot.y(active.closingBalancePaisa)}
            r="7"
            className="active-dot"
          />
        </svg>
      </div>

      <label className="chart-scrubber">
        <span>{copy.audit}</span>
        <input
          type="range"
          min="0"
          max={Math.max(0, days.length - 1)}
          value={safeIndex}
          onChange={(event) => setActiveIndex(Number(event.target.value))}
          aria-label={copy.selectDay}
          aria-valuetext={copy.valueText(
            dateLabel(active.date, { year: true, language }),
            formatBdt(active.closingBalancePaisa, { language }),
          )}
        />
      </label>
      <div className="chart-legend">
        <span><i className="legend-line" aria-hidden="true" /> {copy.balanceLegend}</span>
        <span><i className="legend-dot" aria-hidden="true" /> {copy.rechargeLegend}</span>
        <span><i className="legend-zero" aria-hidden="true" /> {copy.zeroLegend}</span>
      </div>
    </div>
  );
}
