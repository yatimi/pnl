// Created by Tommy.
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAmount,
  validDate,
  validateEntry,
  summarize,
  moveMonth,
} from "../lib/journal.ts";
const entry = (date, amount, category = "trading") => ({
  id: crypto.randomUUID().replaceAll("-", ""),
  date,
  amount,
  category,
  note: "",
});
test("amounts retain exact cents and reject ambiguous or oversized values", () => {
  assert.equal(parseAmount("0.29"), 29);
  assert.equal(parseAmount("125,40"), 12540);
  assert.equal(parseAmount("0"), 0);
  for (const value of [
    "-5",
    "1e3",
    "Infinity",
    "1.001",
    "1,2,3",
    "1000000000",
    "",
  ])
    assert.equal(parseAmount(value), null);
});
test("dates reject rollover and accept leap days", () => {
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2025-02-29"), false);
  assert.equal(validDate("2026-04-31"), false);
  assert.equal(moveMonth("2026-01", -1), "2025-12");
  assert.equal(moveMonth("2024-03", -1), "2024-02");
});
test("salary never increases trading PnL or profitable-day percentage", () => {
  const stats = summarize(
    [
      entry("2026-09-01", 10000),
      entry("2026-09-02", -4000),
      entry("2026-09-03", 0),
      entry("2026-09-02", 250000, "salary"),
      entry("2026-08-02", 999999),
    ],
    "2026-09",
  );
  assert.equal(stats.total, 6000);
  assert.equal(stats.income, 250000);
  assert.equal(stats.winRate, 33);
  assert.equal(stats.active, 3);
  assert.equal(stats.drawdown, 4000);
});
test("drawdown follows chronological peaks, includes initial loss, resets by month", () => {
  const stats = summarize(
    [
      entry("2026-09-03", -8000),
      entry("2026-09-02", 20000),
      entry("2026-09-01", -5000),
      entry("2026-08-30", 1000000),
    ],
    "2026-09",
  );
  assert.equal(stats.drawdown, 8000);
  assert.equal(stats.total, 7000);
  assert.deepEqual(stats.best, ["2026-09-02", 20000]);
  const loss = summarize(
    [entry("2026-09-01", -5000), entry("2026-09-02", -6000)],
    "2026-09",
  );
  assert.equal(loss.drawdown, 11000);
});
test("empty month remains distinguishable from a logged breakeven day", () => {
  assert.equal(summarize([], "2026-09").active, 0);
  assert.equal(summarize([entry("2026-09-01", 0)], "2026-09").active, 1);
});
test("server validation blocks unknown categories, fractional cents, long notes and negative salary", () => {
  assert.ok(validateEntry(entry("2026-09-01", 0)));
  for (const value of [
    entry("2026-09-01", 1.5),
    entry("2026-09-01", -1, "salary"),
    entry("2026-09-01", 1, "toString"),
    { ...entry("2026-09-01", 1), note: "x".repeat(501) },
    entry("2026-09-31", 1),
  ])
    assert.equal(validateEntry(value), null);
});

test("multiple entries are summed per day and daily statistics count the net result", () => {
  const records = [
    entry("2026-09-01", 10000),
    entry("2026-09-01", -100000),
    entry("2026-09-01", 30000, "salary"),
    entry("2026-09-01", 5000, "salary"),
  ];
  const stats = summarize(records, "2026-09");
  assert.equal(stats.total, -90000);
  assert.equal(stats.daily.get("2026-09-01"), -90000);
  assert.equal(stats.active, 1);
  assert.equal(stats.losses, 1);
  assert.equal(stats.wins, 0);
  assert.equal(stats.income, 35000);
});
