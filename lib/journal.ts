// Created by Tommy.
export const categories = {
  trading: "Trading",
  salary: "Salary",
  other: "Other income",
} as const;
export type Category = keyof typeof categories;
export type Entry = {
  id: string;
  date: string;
  category: Category;
  amount: number;
  note: string;
};
export const entryIdPattern = /^[a-f0-9]{32}$/;
export const datePattern = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const monthPattern = /^20\d{2}-(0[1-9]|1[0-2])$/;
export function validDate(value: string) {
  return (
    datePattern.test(value) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function moveMonth(month: string, offset: number) {
  const d = new Date(month + "-15T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}
export function daysInMonth(month: string) {
  return new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
}
export function monthLabel(month: string, locale = "en-US") {
  return new Date(month + "-15T12:00:00Z")
    .toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(" г.", "");
}
export function money(amount: number, signed = true, decimals = true) {
  return (
    (amount < 0 ? "−" : signed && amount > 0 ? "+" : "") +
    "$" +
    (Math.abs(amount) / 100).toLocaleString("en-US", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}
export function compactMoney(amount: number) {
  if (Math.abs(amount) < 100000) return money(amount, true, false);
  return (
    (amount < 0 ? "−" : "+") +
    "$" +
    (Math.abs(amount) / 100).toLocaleString("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    })
  );
}
export function parseAmount(value: string): number | null {
  const cleaned = value.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result <= 99999999999 ? result : null;
}
export function validateEntry(input: unknown): Entry | null {
  if (!input || typeof input !== "object") return null;
  const v = input as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    !entryIdPattern.test(v.id) ||
    typeof v.date !== "string" ||
    !validDate(v.date) ||
    typeof v.category !== "string" ||
    !Object.hasOwn(categories, v.category) ||
    typeof v.amount !== "number" ||
    !Number.isSafeInteger(v.amount) ||
    Math.abs(v.amount) > 99999999999 ||
    typeof v.note !== "string" ||
    v.note.length > 500
  )
    return null;
  if (v.category !== "trading" && v.amount < 0) return null;
  return {
    id: v.id,
    date: v.date,
    category: v.category as Category,
    amount: v.amount,
    note: v.note.trim(),
  };
}
export function summarize(entries: Entry[], month: string) {
  const records = entries.filter((e) => e.date.startsWith(month));
  const daily = new Map<string, number>();
  for (const e of records.filter((e) => e.category === "trading"))
    daily.set(e.date, (daily.get(e.date) ?? 0) + e.amount);
  const ordered = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b));
  let total = 0,
    peak = 0,
    drawdown = 0;
  for (const [, value] of ordered) {
    total += value;
    peak = Math.max(peak, total);
    drawdown = Math.max(drawdown, peak - total);
  }
  const wins = ordered.filter(([, v]) => v > 0).length;
  const losses = ordered.filter(([, v]) => v < 0).length;
  const best = ordered.length
    ? ordered.reduce((a, b) => (b[1] > a[1] ? b : a))
    : null;
  const income = records
    .filter((e) => e.category !== "trading")
    .reduce((s, e) => s + e.amount, 0);
  return {
    total,
    income,
    daily,
    wins,
    losses,
    active: daily.size,
    winRate: daily.size ? Math.round((wins / daily.size) * 100) : 0,
    best,
    drawdown,
  };
}
// Daily values transcribed from the supplied August/September 2026 calendars.
// Integer cents preserve the displayed precision; zero is a recorded result.
export function demoEntries(): Entry[] {
  const months = {
    "2026-08": [
      -57, -3812, -227, 1375, -1045, 16, -1, 16, 0, 0, 0, 0, 0, 0, 0, 2798,
      -591, 1643, 829, 3018, 49396, -4207, 51108, 16023, -28170, 29864, 53341,
      -5764, -30582, -50100, -3952,
    ],
    "2026-09": [
      -3200, 0, 31089, 21219, -19292, -84620, 43322, -36996, 10963, -54343, 0,
    ],
  };
  return Object.entries(months).flatMap(([month, amounts]) =>
    amounts.map((amount, index) => ({
      id: `${month.replace("-", "")}${String(index + 1).padStart(2, "0")}`.padEnd(
        32,
        "0",
      ),
      date: `${month}-${String(index + 1).padStart(2, "0")}`,
      category: "trading" as const,
      amount,
      note: "",
    })),
  );
}
