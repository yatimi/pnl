"use client";
// Created by Tommy.
import { useState } from "react";
import { daysInMonth, money, summarize, type Entry } from "@/lib/journal";
export default function EquityChart({
  entries,
  month,
}: {
  entries: Entry[];
  month: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const { daily } = summarize(entries, month);
  const days = daysInMonth(month);
  let total = 0;
  const points = [
    0,
    ...Array.from({ length: days }, (_, i) => {
      total += daily.get(`${month}-${String(i + 1).padStart(2, "0")}`) ?? 0;
      return total;
    }),
  ];
  const max = Math.max(...points, 10000),
    min = Math.min(...points, 0),
    span = max - min;
  const y = (v: number) => 170 - ((v - min) / span) * 160;
  const path = points
    .map((v, i) => (i === 0 ? `M0 ${y(v)}` : `H${(i / days) * 1000} V${y(v)}`))
    .join(" ");
  return (
    <section className="chart-panel">
      <div className="section-heading">
        <h2>Кривая результата</h2>
        <span className="small muted">Накопленный PnL · USD</span>
      </div>
      <div className="chart-wrap">
        <div className="chart-labels">
          <span>{money(max, false, false)}</span>
          <span>{money(Math.round((max + min) / 2), false, false)}</span>
          <span>{money(min, false, false)}</span>
        </div>
        <svg
          className="equity-chart"
          viewBox="0 0 1000 180"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Накопленный торговый PnL за ${month}: ${money(total)}. Значения по дням доступны в календаре.`}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHover(
              Math.max(
                0,
                Math.min(
                  days,
                  Math.round(((e.clientX - rect.left) / rect.width) * days),
                ),
              ),
            );
          }}
          onPointerLeave={() => setHover(null)}
        >
          <path
            className="grid-line"
            d="M0 10 H1000 M0 90 H1000 M0 170 H1000"
          />
          <path className="zero-line" d={`M0 ${y(0)} H1000`} />
          <path
            className={`equity-line ${total < 0 ? "negative-line" : ""}`}
            d={path}
          />
          {hover !== null && (
            <line
              x1={(hover / days) * 1000}
              x2={(hover / days) * 1000}
              y1="0"
              y2="180"
              stroke="var(--muted-foreground)"
              strokeDasharray="3 4"
            />
          )}
        </svg>
        {hover !== null && (
          <div className="chart-tooltip">
            {hover === 0
              ? "Начало месяца"
              : `${String(hover).padStart(2, "0")}.${month.slice(5)}`}{" "}
            · {money(points[hover])}
          </div>
        )}
        {daily.size === 0 && (
          <div className="chart-empty">Здесь появится твоя история</div>
        )}
      </div>
      <div className="chart-dates">
        <span>01</span>
        <span>10</span>
        <span>20</span>
        <span>{days}</span>
      </div>
    </section>
  );
}
