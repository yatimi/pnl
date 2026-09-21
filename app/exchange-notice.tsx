"use client";
// Created by Tommy.
import { ChevronDown } from "lucide-react";
import type { ExchangeRates } from "@/lib/exchange";
import { useLanguage } from "./language-provider";

export default function ExchangeNotice({ exchange, failed, onRetry }: {
  exchange: ExchangeRates | null;
  failed: boolean;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  return <div className="exchange-notice small muted">
    {exchange ? <details className="rate-details">
      <summary>{t("nbpRates")} · {exchange.date}<ChevronDown size={14} aria-hidden="true" /></summary>
      <div className="rate-content">
        <p>1 EUR = {(exchange.rates.EUR / exchange.rates.USD).toFixed(4)} USD · 1 EUR = {(exchange.rates.EUR / exchange.rates.UAH).toFixed(4)} UAH</p>
        <p>{t("conversionHint")}</p>
        <a href="https://nbp.pl/en/statistic-and-financial-reporting/rates/table-a/" target="_blank" rel="noreferrer">{t("nbpRates")} ↗</a>
      </div>
    </details> : <span role="status">{failed ? t("ratesUnavailable") : t("ratesLoading")}</span>}
    {failed && <div className="rate-error" role="status">
      {exchange && <span>{t("ratesOld")}</span>}
      <button className="text-button" onClick={onRetry}>{t("retry")}</button>
    </div>}
  </div>;
}
