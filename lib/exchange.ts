// Created by Tommy.
import type { Currency, Entry } from "./journal";

export type ExchangeRates = { date: string; rates: Record<Currency, number> };

export function parseExchangeRates(input: unknown): ExchangeRates {
  if (!Array.isArray(input)) throw new Error("Invalid exchange rates");
  const table = input[0];
  if (!table || typeof table.effectiveDate !== "string" ||
      !/^20\d{2}-\d{2}-\d{2}$/.test(table.effectiveDate) || !Array.isArray(table.rates)) {
    throw new Error("Invalid exchange rates");
  }
  const rate = (code: Currency) => {
    const value = table.rates.find((row: { code?: unknown }) => row?.code === code)?.mid;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error("Invalid exchange rates");
    }
    return value;
  };
  // All NBP quotes share PLN as their base; conversion uses their ratio.
  return { date: table.effectiveDate, rates: { USD: rate("USD"), EUR: rate("EUR"), UAH: rate("UAH") } };
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
