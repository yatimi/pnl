// Created by Tommy.
import type { Currency, Entry } from "./journal";

export type ExchangeRates = { date: string; rates: Record<Currency, number> };

export function parseExchangeRates(input: unknown): ExchangeRates {
  if (!Array.isArray(input)) throw new Error("Invalid exchange rates");
  const usd = input.find((row) => row?.cc === "USD");
  const eur = input.find((row) => row?.cc === "EUR");
  if (!usd || !eur || typeof usd.exchangedate !== "string" ||
      !/^\d{2}\.\d{2}\.\d{4}$/.test(usd.exchangedate) ||
      usd.exchangedate !== eur.exchangedate ||
      ![usd.rate, eur.rate].every((rate) => typeof rate === "number" && Number.isFinite(rate) && rate > 0)) {
    throw new Error("Invalid exchange rates");
  }
  return { date: usd.exchangedate.split(".").reverse().join("-"), rates: { USD: usd.rate, EUR: eur.rate, UAH: 1 } };
}

export function convertEntry(entry: Entry, currency: Currency, exchange: ExchangeRates | null): Entry {
  const source = entry.currency ?? "USD";
  if (source === currency) return { ...entry, currency };
  if (!exchange) throw new Error("Exchange rates unavailable");
  // Round once to minor units, symmetrically for gains and losses.
  const amount = Math.sign(entry.amount) * Math.round(Math.abs(entry.amount) * exchange.rates[source] / exchange.rates[currency]);
  if (!Number.isSafeInteger(amount)) throw new Error("Converted amount too large");
  return { ...entry, amount, currency };
}
