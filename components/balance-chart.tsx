"use client";

import { useMemo, useState } from "react";

import { dateLabel, monthLabel } from "@/lib/date.ts";
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

export function BalanceChart({ days }: { days: LedgerDay[] }) {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, days.length - 1));
  const active = days[Math.min(activeIndex, days.length - 1)];
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
          <span className="eyebrow">Selected day</span>
          <strong>{dateLabel(active.date, { year: true })}</strong>
        </div>
        <div>
          <span className="eyebrow">Closing balance</span>
          <strong className={active.closingBalancePaisa < 0 ? "danger-text" : ""}>
            {formatBdt(active.closingBalancePaisa)}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Used / day charge</span>
          <strong>
            {active.units} units · {formatBdt(active.energyPaisa + active.vatPaisa)}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Recharge</span>
          <strong>{active.rechargePaisa ? formatBdt(active.rechargePaisa, { sign: true }) : "None"}</strong>
        </div>
      </div>

      <div className="chart-scroll">
        <svg
          className="balance-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Daily prepaid meter balance line. Green markers show recharge dates."
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
            ৳0
          </text>
          <text x={MARGIN.left - 12} y={MARGIN.top + 4} textAnchor="end" className="axis-label">
            {formatBdt(plot.max, { decimals: false })}
          </text>
          <text x={MARGIN.left - 12} y={HEIGHT - MARGIN.bottom} textAnchor="end" className="axis-label">
            {formatBdt(plot.min, { decimals: false })}
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
                {monthLabel(day.month).split(" ")[0]}
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
                  aria-label={`${dateLabel(day.date, { year: true })}: recharged ${formatBdt(day.rechargePaisa)}`}
                />
              </g>
            ) : null,
          )}

          <line
            x1={plot.x(activeIndex)}
            x2={plot.x(activeIndex)}
            y1={MARGIN.top}
            y2={HEIGHT - MARGIN.bottom}
            className="active-line"
          />
          <circle
            cx={plot.x(activeIndex)}
            cy={plot.y(active.closingBalancePaisa)}
            r="7"
            className="active-dot"
          />
        </svg>
      </div>

      <label className="chart-scrubber">
        <span>Drag to audit any day</span>
        <input
          type="range"
          min="0"
          max={Math.max(0, days.length - 1)}
          value={activeIndex}
          onChange={(event) => setActiveIndex(Number(event.target.value))}
          aria-label="Select a ledger day"
        />
      </label>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="legend-line" /> Closing balance</span>
        <span><i className="legend-dot" /> Recharge</span>
        <span><i className="legend-zero" /> Zero balance</span>
      </div>
    </div>
  );
}
