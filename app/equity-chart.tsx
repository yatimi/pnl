"use client";
// Created by Tommy.
import { useState } from "react";
import { useLanguage } from "./language-provider";
import { type DateRange, shiftDate, money as formatMoney, summarize, type Currency, type Entry } from "@/lib/journal";
export default function EquityChart({
  entries,
  range,
  currency,
}: {
  entries: Entry[];
  range: DateRange;
  currency: Currency;
}) {
  const money = (amount: number, signed = true, decimals = true) => formatMoney(amount, signed, decimals, currency);
  const { t, locale } = useLanguage();
  const [hover, setHover] = useState<number | null>(null);
  const { daily } = summarize(entries, range);
  const days = Math.round((Date.parse(range.end) - Date.parse(range.start)) / 86400000) + 1;
  const dates = [...daily.keys()].sort();
  const points = [0];
  for (const date of dates) points.push(points[points.length - 1] + (daily.get(date) ?? 0));
  const total = points[points.length - 1];
  const dayOffsets = [0, ...dates.map((date) => Math.round((Date.parse(date) - Date.parse(range.start)) / 86400000) + 1)];
  const hoveredTotal = hover === null ? 0 : points[dayOffsets.findLastIndex((day) => day <= hover)];
  const max = Math.max(...points, 10000),
    min = Math.min(...points, 0),
    span = max - min;
  const y = (v: number) => 170 - ((v - min) / span) * 160;
  const path = points
    .map((v, i) => (i === 0 ? `M0 ${y(v)}` : `H${(dayOffsets[i] / days) * 1000} V${y(v)}`))
    .join(" ") + ` H1000`;
  return (
    <section className="chart-panel">
      <div className="section-heading">
        <h2>{t("curve")}</h2>
        <span className="small muted">{t("cumulativePnl") + " · " + currency}</span>
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
          aria-label={t("chartLabel", { month: `${range.start} – ${range.end}`, amount: money(total) })}
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
              ? t("monthStart")
              : new Date(
                  `${shiftDate(range.start, hover - 1)}T12:00:00Z`,
                ).toLocaleDateString(locale, {
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })}{" "}
            · {money(hoveredTotal)}
          </div>
        )}
        {daily.size === 0 && (
          <div className="chart-empty">{t("chartEmpty")}</div>
        )}
      </div>
      <div className="chart-dates">
        <span>{range.start}</span>
        <span>{range.end}</span>
      </div>
    </section>
  );
}
