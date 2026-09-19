"use client";
// Created by Tommy.
import { useEffect, useState } from "react";
import type { MarketSnapshot } from "@/lib/market";
import { useLanguage } from "./language-provider";
export default function MarketWidget() {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"gainers" | "losers">("gainers");
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/market", { signal: controller.signal });
        if (!response.ok) throw new Error();
        const snapshot = await response.json() as MarketSnapshot;
        if (!controller.signal.aborted) { setData(snapshot); setError(false); }
      } catch { if (!controller.signal.aborted) setError(true); }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [open, retry]);
  return <details className="market-panel" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>{t("marketTitle")} <span className="small muted">Binance · USDT · 24h</span></summary>
    {open && <div className="market-content">
      <div className="market-controls" role="group" aria-label={t("marketTitle")}>
        {(["gainers", "losers"] as const).map((value) => <button key={value} className="text-button" aria-pressed={side === value} onClick={() => setSide(value)}>{t(value)}</button>)}
      </div>
      <p className="small muted">{t("marketHint")}</p>
      {error && <p role="status">{t("marketUnavailable")} <button className="text-button" onClick={() => setRetry((n) => n + 1)}>{t("retry")}</button></p>}
      {!data && !error && <p role="status">{t("marketLoading")}</p>}
      {data && <>
        <ol className="market-list">{data[side].map((row) => <li key={row.symbol}>
          <a href={`https://www.binance.com/en/trade/${encodeURIComponent(row.asset)}_USDT?type=spot`} target="_blank" rel="noreferrer">{row.asset}<span className="small muted"> / USDT</span></a>
          <span>{Number(row.price).toLocaleString(locale, { maximumSignificantDigits: 8 })}</span>
          <strong className={row.change < 0 ? "negative" : "positive"}>{row.change > 0 ? "+" : ""}{row.change.toFixed(2)}%</strong>
        </li>)}</ol>
        {!data[side].length && <p>{t("marketEmpty")}</p>}
        <p className="small muted">{t(error ? "marketStale" : "marketUpdated")} {new Date(data.updatedAt).toLocaleString(locale)}</p>
      </>}
    </div>}
  </details>;
}
