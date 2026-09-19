// Created by Tommy.
import test from "node:test";
import assert from "node:assert/strict";
import { periodRange, summarize, demoEntries } from "../lib/journal.ts";
const custom = { start: "2025-12-30", end: "2026-01-04" };
test("periods cover leap months, Monday weeks across years, years and full history", () => {
  assert.deepEqual(periodRange("week", "2026-01-01", [], custom), { start: "2025-12-29", end: "2026-01-04" });
  assert.deepEqual(periodRange("month", "2024-02-10", [], custom), { start: "2024-02-01", end: "2024-02-29" });
  assert.deepEqual(periodRange("year", "2026-09-19", [], custom), { start: "2026-01-01", end: "2026-12-31" });
  assert.deepEqual(periodRange("all", "2026-09-19", demoEntries(), custom), { start: "2026-08-01", end: "2026-09-11" });
  assert.deepEqual(periodRange("custom", "2026-09-19", [], custom), custom);
  assert.deepEqual(periodRange("all", "2026-09-19", [], custom), { start: "2026-09-19", end: "2026-09-19" });
});
test("range statistics include both boundaries, net same-day entries, zero days and exclude salary", () => {
  const records = [
    { date: "2025-12-29", amount: 90000, category: "trading" },
    { date: "2025-12-30", amount: 1000, category: "trading" },
    { date: "2025-12-30", amount: -400, category: "trading" },
    { date: "2026-01-02", amount: -800, category: "trading" },
    { date: "2026-01-04", amount: 0, category: "trading" },
    { date: "2026-01-04", amount: 300000, category: "salary" },
    { date: "2026-01-05", amount: 90000, category: "trading" },
  ];
  const stats = summarize(records, custom);
  assert.equal(stats.total, -200); assert.equal(stats.active, 3);
  assert.equal(stats.wins, 1); assert.equal(stats.losses, 1); assert.equal(stats.winRate, 33);
  assert.equal(stats.drawdown, 800); assert.equal(stats.income, 300000);
});
