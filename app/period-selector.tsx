"use client";
// Created by Tommy.
import { useState } from "react";
import { validDate, type DateRange, type Period } from "@/lib/journal";
import { useLanguage } from "./language-provider";

export default function PeriodSelector({ period, range, custom, onSelect, onApply }: {
  period: Period;
  range: DateRange;
  custom: DateRange;
  onSelect: (period: Period) => void;
  onApply: (range: DateRange) => void;
}) {
  const { t } = useLanguage();
  const [error, setError] = useState(false);
  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const start = String(data.get("start"));
    const end = String(data.get("end"));
    const valid = validDate(start) && validDate(end) && start <= end;
    setError(!valid);
    if (valid) onApply({ start, end });
  }
  return <div className="period-toolbar">
    <div role="group" aria-label={t("periodLabel")} className="period-options">
      {(["week", "month", "year", "all", "custom"] as const).map((value) => (
        <button key={value} className="text-button" aria-pressed={period === value} onClick={() => onSelect(value)}>{t(value)}</button>
      ))}
    </div>
    {period === "custom" && <form className="custom-period" onSubmit={apply}>
      <label>{t("periodFrom")} <input name="start" type="date" required min="2000-01-01" max="2099-12-31" defaultValue={custom.start} /></label>
      <label>{t("periodTo")} <input name="end" type="date" required min="2000-01-01" max="2099-12-31" defaultValue={custom.end} /></label>
      <button className="text-button" type="submit">{t("applyPeriod")}</button>
      {error && <span role="alert" className="negative">{t("invalidPeriod")}</span>}
    </form>}
    <span className="small muted">{range.start} – {range.end}</span>
  </div>;
}
