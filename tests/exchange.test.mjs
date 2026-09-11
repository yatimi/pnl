// Created by Tommy.
import test from "node:test";
import assert from "node:assert/strict";
import { convertEntry, parseExchangeRates } from "../lib/exchange.ts";
import { validateEntry, summarize, money, compactMoney } from "../lib/journal.ts";
const rates = parseExchangeRates([
  { cc: "USD", rate: 40, exchangedate: "11.09.2026" },
  { cc: "EUR", rate: 50, exchangedate: "11.09.2026" },
]);
const entry = { id: "a".repeat(32), date: "2026-09-01", category: "trading", amount: 10000, currency: "USD", note: "" };
test("cross-currency totals use rounded minor units and preserve originals", () => {
  assert.equal(convertEntry(entry, "EUR", rates).amount, 8000);
  assert.equal(convertEntry(entry, "UAH", rates).amount, 400000);
  assert.equal(convertEntry({ ...entry, currency: "UAH", amount: 20 }, "USD", rates).amount, 1);
  assert.equal(convertEntry({ ...entry, currency: "UAH", amount: -20 }, "USD", rates).amount, -1);
  const records = [entry, { ...entry, currency: "EUR", amount: -8000 }, { ...entry, currency: "UAH", category: "salary", amount: 400000 }];
  const stats = summarize(records.map((e) => convertEntry(e, "USD", rates)), "2026-09");
  assert.equal(stats.total, 0);
  assert.equal(stats.income, 10000);
  assert.equal(entry.amount, 10000);
  assert.equal(entry.currency, "USD");
});
test("missing rates never invent a conversion; same currency works offline", () => {
  assert.throws(() => convertEntry(entry, "EUR", null));
  assert.deepEqual(convertEntry(entry, "USD", null), entry);
});
test("invalid provider data and unsupported currencies are rejected", () => {
  for (const input of [null, [], [{ cc: "USD", rate: 0 }], [
    { cc: "USD", rate: 40, exchangedate: "11.09.2026" },
    { cc: "EUR", rate: 50, exchangedate: "10.09.2026" },
  ]]) assert.throws(() => parseExchangeRates(input));
  for (const currency of ["GBP", "toString", null, 12]) assert.equal(validateEntry({ ...entry, currency }), null);
  const { currency, ...legacy } = entry;
  assert.equal(validateEntry(legacy).currency, "USD");
  for (const currency of ["USD", "EUR", "UAH"]) assert.equal(validateEntry({ ...entry, currency }).currency, currency);
  assert.equal(money(123, true, true, "EUR"), "+€1.23");
  assert.equal(compactMoney(123, "UAH"), "+₴1.23");
});
