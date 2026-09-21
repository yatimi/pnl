"use client";
// Created by Tommy.
import { Fragment, useEffect, useRef, useState } from "react";
import { isLanguage, isTranslationKey } from "@/lib/i18n";
import { useLanguage } from "./language-provider";
import { convertEntry, type ExchangeRates } from "@/lib/exchange";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { flushSync } from "react-dom";
import {
  Share2,
  Settings,
  Moon,
  Sun,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  List,
  ArrowUpRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster, toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import EntryEditor from "./entry-editor";
import ShareDialog from "./share-dialog";
import EquityChart from "./equity-chart";
import MarketWidget from "./market-widget";
import PeriodSelector from "./period-selector";
import ExchangeNotice from "./exchange-notice";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  compactMoney as formatCompactMoney,
  currencies,
  currencySymbols,
  isCurrency,
  type Currency,
  daysInMonth,
  demoEntries,
  localDate,
  money as formatMoney,
  monthLabel,
  monthPattern,
  moveMonth,
  summarize,
  periodRange,
  inRange,
  shiftDate,
  type Period,
  validateEntry,
  type Entry,
} from "@/lib/journal";

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const result = (await response
    .json()
    .catch(() => ({ error: "serverUnavailable" }))) as {
    error?: string;
    entries?: Entry[];
  };
  if (!response.ok) throw new Error(result.error ?? "requestFailed");
  return result;
}
export default function Dashboard({ initialDemo = false }: { initialDemo?: boolean }) {
  const { language, locale, setLanguage, t } = useLanguage();
  const [currency, setCurrency] = useState<Currency>("USD");
  const [exchange, setExchange] = useState<ExchangeRates | null>(null);
  const [ratesError, setRatesError] = useState(false);
  const [ratesReload, setRatesReload] = useState(0);
  useEffect(() => {
    try {
      const value = localStorage.getItem("pnl-currency");
      if (isCurrency(value)) setCurrency(value);
    } catch {}
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/exchange-rates", { signal: controller.signal });
        if (!response.ok) throw new Error();
        const value = await response.json() as ExchangeRates;
        if (!controller.signal.aborted) { setExchange(value); setRatesError(false); }
      } catch {
        if (!controller.signal.aborted) setRatesError(true);
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 3600000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [ratesReload]);
  const money = (amount: number, signed = true, decimals = true) => formatMoney(amount, signed, decimals, currency);
  const compactMoney = (amount: number) => formatCompactMoney(amount, currency);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(Date.UTC(2026, 0, 5 + index))
      .toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })
      .toUpperCase(),
  );
  const [month, setMonth] = useState(() => initialDemo ? "2026-09" : localDate().slice(0, 7));
  const [period, setPeriod] = useState<Period>("month");
  const [custom, setCustom] = useState({ start: localDate(), end: localDate() });
  const [weekAnchor, setWeekAnchor] = useState(() => initialDemo ? "2026-09-11" : localDate());
  const anchor = period === "week" ? weekAnchor : month === localDate().slice(0, 7) ? localDate() : month + "-01";
  const [entries, setEntries] = useState<Entry[]>([]),
    [demo, setDemo] = useState(initialDemo),
    [demoData, setDemoData] = useState<Entry[]>(() => initialDemo ? demoEntries() : []);
  const [theme, setTheme] = useState("dark"),
    [view, setView] = useState("calendar");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [shareCard, setShareCard] = useState<{ entry?: Entry } | null>(null);
  const addEntryButton = useRef<HTMLButtonElement>(null);
  const [editor, setEditor] = useState<{
    id: string;
    date: string;
    entry?: Entry;
    trigger: HTMLButtonElement;
  } | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pnl-theme");
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("pnl-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (demo) {
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api(`/api/entries?month=${localDate().slice(0, 7)}&all=true`, { signal: controller.signal })
      .then((data) => {
        if (
          !Array.isArray(data.entries) ||
          !data.entries.every((e) => validateEntry(e))
        )
          throw new Error("invalidData");
        if (!controller.signal.aborted) setEntries(data.entries.map((entry) => validateEntry(entry)!));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [demo, reload]);
  const originalRecords: Entry[] = demo
    ? demoData.map((entry) => ({
        ...entry,
        note:
          entry.note === "__demo_planned_exit__"
            ? t("demoNote")
            : entry.note === "__demo_salary__"
              ? t("salary")
              : entry.note,
      }))
    : entries;
  const needsConversion = originalRecords.some((entry) => (entry.currency ?? "USD") !== currency);
  const conversionUnavailable = needsConversion && !exchange;
  const records = conversionUnavailable ? [] : originalRecords.map((entry) => convertEntry(entry, currency, exchange));
  const range = periodRange(period, anchor, records, custom);
  const periodLabel = `${range.start} – ${range.end}`;
  const calendarStats = summarize(records, month);
  const stats = summarize(records, range),
    prev = summarize(records, moveMonth(month, -1));
  const current = records
    .filter((e) => inRange(e.date, range))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.category.localeCompare(b.category) ||
        a.id.localeCompare(b.id),
    );
  const days = daysInMonth(month),
    offset = (new Date(month + "-01T12:00:00Z").getUTCDay() + 6) % 7;
  const cells = Math.ceil((offset + days) / 7) * 7;
  const monthlyStats = Array.from({ length: 12 }, (_, index) =>
    moveMonth(month, index - 11),
  )
    .filter((value) => monthPattern.test(value))
    .map((value) => ({ month: value, ...summarize(records, value) }));
  const monthlyMax = Math.max(
    1,
    ...monthlyStats.map((value) => Math.abs(value.total)),
  );
  const unavailable = loading || !!error || conversionUnavailable;
  function movePeriod(direction: number) {
    if (period === "week") {
      const date = shiftDate(weekAnchor, direction * 7);
      setWeekAnchor(date);
      setMonth(date.slice(0, 7));
    } else {
      setMonth(moveMonth(month, direction * (period === "year" ? 12 : 1)));
    }
  }
  function openDay(date: string, trigger: HTMLButtonElement) {
    setEditor({ id: crypto.randomUUID().replaceAll("-", ""), date, trigger });
  }
  function toggleDemo() {
    if (demo) {
      if (initialDemo) { window.location.assign("/sign-in"); return; }
      setDemo(false);
      setMonth(localDate().slice(0, 7));
      setWeekAnchor(localDate());
    } else {
      const m = "2026-09";
      setDemoData(demoEntries());
      setMonth(m);
      setWeekAnchor("2026-09-11");
      setDemo(true);
    }
  }
  async function save(entry: Entry) {
    if (!demo)
      await api("/api/entries", { method: "PUT", body: JSON.stringify(entry) });
    const update = (old: Entry[]) => [
      ...old.filter((e) => e.id !== entry.id),
      entry,
    ];
    if (demo) setDemoData(update);
    else setEntries(update);
    setMonth(entry.date.slice(0, 7));
    setWeekAnchor(entry.date);
    toast.success(demo ? t("demoSaved") : t("saved"));
  }
  async function remove(id: string) {
    if (!demo)
      await api(`/api/entries?id=${id}`, {
        method: "DELETE",
      });
    const update = (old: Entry[]) => old.filter((e) => e.id !== id);
    if (demo) setDemoData(update);
    else setEntries(update);
    toast.success(t("deleted"));
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: {
              signal: AbortSignal;
            },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "navigate_pnl_month",
          title: t("openMonthTitle"),
          description: t("openMonthDescription"),
          inputSchema: {
            type: "object",
            properties: {
              month: {
                type: "string",
                pattern: "^20[0-9]{2}-(0[1-9]|1[0-2])$",
              },
            },
            required: ["month"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: async (input: unknown) => {
            const value = (
              input as {
                month?: unknown;
              }
            )?.month;
            if (typeof value !== "string" || !monthPattern.test(value))
              throw new Error(t("invalidMonth"));
            flushSync(() => {
              setMonth(value);
              setPeriod("month");
              setView("calendar");
            });
            return { month: value, status: "month_selected" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [t]);
  const metric = (value: string) => (unavailable ? "—" : value);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label={t("home")}>
          pnl<span className="brand-pixel">.</span>
        </a>
        <span className="header-caption">{t("journal")}</span>
        <div className="header-actions">
          {!initialDemo && <form action="/auth/signout" method="post"><button className="text-button" type="submit">{t("signOut")}</button></form>}
          <button
            className="icon-button"
            disabled={unavailable || stats.active === 0}
            onClick={() => setShareCard({})}
            aria-label={t("shareTitle")}
            title={t("shareTitle")}
          >
            <Share2 size={18} />
          </button>
          <button
            className={"demo-button " + (demo ? "is-demo" : "")}
            onClick={toggleDemo}
          >
            {demo ? t("myJournal") : t("demo")}
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="icon-button" aria-label={t("preferences")} title={t("preferences")}><Settings size={18} /></button>
            </PopoverTrigger>
            <PopoverContent align="end" className="journal-preferences" aria-label={t("preferences")}>
              <h2>{t("preferences")}</h2>
              <div className="preference-controls">
                <ToggleGroup
                  type="single"
                  className="language-switch"
                  value={language}
                  onValueChange={(value) => {
                    if (isLanguage(value)) setLanguage(value);
                  }}
                  aria-label={t("languageLabel")}
                >
                  <ToggleGroupItem value="en" lang="en" aria-label="English">
                    EN
                  </ToggleGroupItem>
                  <ToggleGroupItem value="ru" lang="ru" aria-label="Русский">
                    RU
                  </ToggleGroupItem>
                </ToggleGroup>
                <Select value={currency} onValueChange={(value) => {
                  if (isCurrency(value)) {
                    setCurrency(value);
                    setShareCard(null);
                    try { localStorage.setItem("pnl-currency", value); } catch {}
                  }
                }}>
                  <SelectTrigger className="currency-switch" aria-label={t("displayCurrency")}><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
                </Select>
                <button
                  className="icon-button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label={theme === "dark" ? t("lightTheme") : t("darkTheme")}
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{t("dayByDay")}</p>
            <h1>
              {t("headline")}
              <span className="positive">.</span>
            </h1>
            <p className="muted">{t("subtitle")}</p>
          </div>
          <button
            ref={addEntryButton}
            className="primary-button"
            disabled={loading || !!error}
            onClick={(event) =>
              openDay(
                month === localDate().slice(0, 7) ? localDate() : month + "-01",
                event.currentTarget,
              )
            }
          >
            <Plus size={18} /> {t("addDay")}
          </button>
        </div>
        <div className="workspace-context">
          {demo && (
            <details className="preview-notice">
              <summary>{t("demoHeading")}</summary>
              <p>{t("demoHint")}</p>
            </details>
          )}
          <ExchangeNotice exchange={exchange} failed={ratesError} onRetry={() => setRatesReload((value) => value + 1)} />
        </div>
        <Tabs value={view} onValueChange={setView} className="journal-tabs">
          <div className="toolbar">
            <TabsList variant="line" className="view-tabs">
              <TabsTrigger value="calendar">
                <CalendarDays />
                {t("calendar")}
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <ChartNoAxesColumnIncreasing />
                {t("analytics")}
              </TabsTrigger>
              <TabsTrigger value="entries">
                <List />
                {t("entries")}
              </TabsTrigger>
            </TabsList>
            <div className="month-switch">
              <button
                className="icon-button"
                disabled={period === "year" ? month.startsWith("2000") : period === "week" ? weekAnchor <= "2000-01-07" : month === "2000-01"}
                onClick={() => movePeriod(-1)}
                aria-label={t("previousPeriod")}
              >
                <ChevronLeft size={18} />
              </button>
              <span>{monthLabel(month, locale)}</span>
              <button
                className="icon-button"
                disabled={period === "year" ? month.startsWith("2099") : period === "week" ? weekAnchor >= "2099-12-25" : month === "2099-12"}
                onClick={() => movePeriod(1)}
                aria-label={t("nextPeriod")}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <span className="currency-label">{currency} / {currencySymbols[currency]}</span>
          </div>
          <PeriodSelector period={period} range={range} custom={custom}
            onSelect={(value) => {
              setPeriod(value);
              if (value === "week") setWeekAnchor(month === localDate().slice(0, 7) ? localDate() : month + "-01");
              setShareCard(null);
            }}
            onApply={(value) => { setCustom(value); setMonth(value.start.slice(0, 7)); }}
          />
          {loading && (
            <p role="status" className="status-message">
              {t("loading")}
            </p>
          )}
          {error && (
            <div className="status-message form-error" role="alert">
              {t(isTranslationKey(error) ? error : "requestFailed")}
              <button
                className="text-button"
                onClick={() => setReload((v) => v + 1)}
              >
                {t("retry")}
              </button>
            </div>
          )}
          {conversionUnavailable && <div className="status-message">
            {originalRecords.filter((entry) => entry.date.startsWith(month)).map((entry) => <button key={entry.id} className="text-button" onClick={(event) => setEditor({ id: entry.id, date: entry.date, entry, trigger: event.currentTarget })}>
              {entry.date} · {t(entry.category)} · {formatMoney(entry.amount, true, true, entry.currency ?? "USD")}
            </button>)}
          </div>}
          <section className="stats-grid" aria-label={t("monthTotals")}>
            <div className="stat">
              <p>{t("monthResult")}</p>
              <strong className={stats.total < 0 ? "negative" : "positive"}>
                {metric(money(stats.total))}
              </strong>
              <span>
                {!unavailable && period === "month" && prev.active > 0
                  ? t("monthChange", {
                      amount: money(stats.total - prev.total),
                    })
                  : t("tradingPnl")}
              </span>
            </div>
            <div className="stat">
              <p>{t("profitableDays")}</p>
              <strong>
                {metric(stats.active ? String(stats.winRate) : "—")}
                <span className="unit">%</span>
              </strong>
              <span>{unavailable ? "…" : t("dayBreakdown", { wins: stats.wins, losses: stats.losses, flat: stats.active - stats.wins - stats.losses })}</span>
              <div className="winrate-bar" aria-hidden="true">
                <i className="win-segment" style={{ flex: stats.wins }} /><i className="loss-segment" style={{ flex: stats.losses }} /><i className="flat-segment" style={{ flex: stats.active - stats.wins - stats.losses }} />
              </div>
              <span className="small muted">{t("winrateHint")}</span>
            </div>
            <div className="stat">
              <p>{t("bestDay")}</p>
              <strong
                className={
                  stats.best && stats.best[1] < 0 ? "negative" : "positive"
                }
              >
                {metric(stats.best ? money(stats.best[1]) : "—")}
              </strong>
              <span>
                {!unavailable && stats.best
                  ? new Date(stats.best[0] + "T12:00:00Z").toLocaleDateString(
                      locale,
                      { day: "numeric", month: "long", timeZone: "UTC" },
                    )
                  : t("noEntries")}
              </span>
            </div>
          </section>
          <div className="income-summary">
            <span>{t("salaryAndOther")}</span>
            <strong>{metric(money(stats.income, false))}</strong>
          </div>
          {!unavailable && (
            <>
              <TabsContent value="calendar" className="calendar-view">
                <section className="calendar-panel" key={month + periodLabel}>
                  <div className="section-heading">
                    <h2>{t("pnlCalendar")}</h2>
                    <div className="calendar-legend small">
                      <span className="positive">{t("gainLegend")}</span>
                      <span className="negative">{t("lossLegend")}</span>
                      <span className="muted">{t("emptyLegend")}</span>
                    </div>
                  </div>
                  {current.length === 0 && (
                    <div className="empty-hint">
                      <span>{t("firstEntryHint")}</span> {t("clickDayHint")}
                    </div>
                  )}
                  <div className="calendar-grid calendar-with-weeks">
                    {weekdays.map((d) => (
                      <div className="weekday" key={d}>
                        {d}
                      </div>
                    ))}
                    <div className="weekday">{t("weekTotal")}</div>
                    {Array.from({ length: cells }, (_, i) => {
                      const day = i - offset + 1;
                      const outside = day < 1 || day > days;
                      const weekStart = shiftDate(month + "-01", i - i % 7 - offset);
                      const weekEnd = shiftDate(weekStart, 6);
                      const weekStats = i % 7 === 6 ? summarize(current, {
                        start: weekStart < month + "-01" ? month + "-01" : weekStart,
                        end: weekEnd > `${month}-${days}` ? `${month}-${days}` : weekEnd,
                      }) : null;
                      const weekly = weekStats && (
                        <div className="week-total" aria-label={`${t("weekTotal")} ${weekStart} – ${weekEnd}`}>
                          <span className="small muted">{t("weekTotal")}</span>
                          <strong className={weekStats.total < 0 ? "negative" : "positive"}>
                            {weekStats.active ? compactMoney(weekStats.total) : "—"}
                          </strong>
                        </div>
                      );
                      if (outside) return <Fragment key={i}><div className="day-cell outside" aria-hidden="true" />{weekly}</Fragment>;
                      const date = `${month}-${String(day).padStart(2, "0")}`,
                        value = calendarStats.daily.get(date);
                      const income = records
                        .filter(
                          (e) => e.date === date && e.category !== "trading",
                        )
                        .reduce((s, e) => s + e.amount, 0);
                      return (
                        <Fragment key={i}><button
                          onPointerEnter={() => setActiveDate(date)}
                          onPointerLeave={() => setActiveDate(null)}
                          onFocus={() => setActiveDate(date)}
                          onBlur={() => setActiveDate(null)}
                          className={`day-cell ${activeDate === date ? "is-active" : ""} ${!inRange(date, range) ? "out-of-period" : ""} ${value === undefined ? "" : value > 0 ? "gain" : value < 0 ? "loss" : ""} ${date === localDate() ? "today" : ""}`}
                          onClick={(event) => openDay(date, event.currentTarget)}
                          aria-label={t("openDay", {
                            day,
                            month: monthLabel(month, locale),
                            result:
                              value === undefined
                                ? t("noTradingEntry")
                                : money(value),
                            income: income
                              ? t("incomeSuffix", { amount: money(income) })
                              : "",
                          })}
                        >
                          <span className="day-number">
                            {String(day).padStart(2, "0")}
                            {date === localDate() && (
                              <span className="today-mark" />
                            )}
                          </span>
                          <span className="day-value">
                            {value === undefined ? "—" : compactMoney(value)}
                          </span>
                          <span className="pixel-meter" aria-hidden="true">
                            {value !== undefined && value !== 0
                              ? "▪ ".repeat(
                                  Math.min(
                                    5,
                                    Math.max(
                                      1,
                                      Math.ceil(Math.abs(value) / 10000),
                                    ),
                                  ),
                                )
                              : ""}
                          </span>
                          {income > 0 && (
                            <span
                              className="income-marker"
                              title={t("incomeTitle", {
                                amount: money(income),
                              })}
                            >
                              +$
                            </span>
                          )}
                        </button>{weekly}</Fragment>
                      );
                    })}
                  </div>
                  <p className="calendar-footnote">{t("calendarFootnote")}</p>
                </section>
                <EquityChart key={periodLabel} entries={records} range={range} currency={currency} activeDate={activeDate && inRange(activeDate, range) ? activeDate : null} onActiveDateChange={setActiveDate} />
              </TabsContent>
              <TabsContent value="analytics">
                <EquityChart key={periodLabel} entries={records} range={range} currency={currency} />
                <div className="analytics-grid">
                  <section className="insight-panel">
                    <p className="eyebrow">{t("summaryHeading")}</p>
                    <h2>
                      {stats.active === 0
                        ? t("insufficientEntries")
                        : period === "month" && stats.total > prev.total && prev.active
                          ? t("improved")
                          : stats.total > 0
                            ? t("positiveMonth")
                            : stats.total < 0
                              ? t("negativeMonth")
                              : t("breakeven")}
                    </h2>
                    <p>
                      {stats.active === 0
                        ? t("summaryEmpty")
                        : t("summaryBody", {
                            active: stats.active,
                            total: money(stats.total),
                            wins: stats.wins,
                            losses: stats.losses,
                            flat: stats.active - stats.wins - stats.losses,
                          })}
                    </p>
                    {period === "month" && prev.active > 0 && stats.active > 0 && (
                      <p>
                        {t("previousChange")}{" "}
                        <span
                          className={
                            stats.total - prev.total < 0
                              ? "negative"
                              : "positive"
                          }
                        >
                          {money(stats.total - prev.total)}
                        </span>
                        {t("comparisonNote")}
                      </p>
                    )}
                    <span className="small muted">{t("summaryMethod")}</span>
                  </section>
                  <section className="insight-panel">
                    <p className="eyebrow">{t("details")}</p>
                    <dl className="detail-metrics">
                      <div>
                        <dt>{t("averageDay")}</dt>
                        <dd>
                          {stats.active
                            ? money(Math.round(stats.total / stats.active))
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("drawdown")}</dt>
                        <dd>{stats.active ? money(-stats.drawdown) : "—"}</dd>
                      </div>
                      <div>
                        <dt>{t("combinedIncome")}</dt>
                        <dd>{money(stats.total + stats.income)}</dd>
                      </div>
                    </dl>
                    <p className="small muted">{t("drawdownHelp")}</p>
                  </section>
                </div>
                <section className="month-history">
                  <div className="section-heading">
                    <h2>{t("lastMonths")}</h2>
                    <span className="small muted">{t("tradingPnl")}</span>
                  </div>
                  <div className="monthly-bars">
                    {monthlyStats.map((s) => {
                      const m = s.month;
                      return (
                        <button
                          key={m}
                          onClick={() => { setMonth(m); setPeriod("month"); }}
                          className="month-bar"
                          aria-label={t("openMonthLabel", {
                            month: monthLabel(m, locale),
                            amount: s.active ? money(s.total) : t("noTradingEntry"),
                          })}
                        >
                          <span className="bar-value">
                            {s.active ? money(s.total, true, false) : "—"}
                          </span>
                          <span className="bar-area">
                            <span
                              style={{
                                height: s.active
                                  ? `${Math.max(3, (Math.abs(s.total) / monthlyMax) * 100)}%`
                                  : "2px",
                                background:
                                  s.total < 0
                                    ? "var(--negative)"
                                    : s.active
                                      ? "var(--positive)"
                                      : "var(--border)",
                              }}
                            />
                          </span>
                          <span>
                            {new Date(m + "-15")
                              .toLocaleDateString(locale, { month: "short" })
                              .replace(".", "")}
                          </span>
                          <span className="small muted">{m.slice(2, 4)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </TabsContent>
              <TabsContent value="entries">
                <div className="section-heading">
                  <h2>{t("monthEntries")}</h2>
                  <span className="small muted">
                    {current.length} {t("entryCountLabel")}
                  </span>
                </div>
                {current.length === 0 ? (
                  <div className="empty-records">
                    <CalendarDays size={28} />
                    <h2>{t("emptyTitle")}</h2>
                    <p className="muted">{t("emptyBody")}</p>
                    <button
                      className="primary-button"
                      onClick={(event) => openDay(month + "-01", event.currentTarget)}
                    >
                      <Plus size={18} /> {t("firstEntry")}
                    </button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("date")}</TableHead>
                        <TableHead>{t("source")}</TableHead>
                        <TableHead>{t("note")}</TableHead>
                        <TableHead className="text-right">
                          {t("amount")}
                        </TableHead>
                        <TableHead>
                          <span className="sr-only">{t("action")}</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {current.map((e) => {
                        const original = originalRecords.find((record) => record.id === e.id)!;
                        return (
                        <TableRow key={e.id}>
                          <TableCell className="mono">
                            {new Date(e.date + "T12:00:00Z").toLocaleDateString(
                              locale,
                              {
                                day: "2-digit",
                                month: "2-digit",
                                timeZone: "UTC",
                              },
                            )}
                          </TableCell>
                          <TableCell>{t(e.category)}</TableCell>
                          <TableCell className="note-cell muted">
                            {e.note || "—"}
                          </TableCell>
                          <TableCell
                            className={`mono text-right ${e.amount < 0 ? "negative" : "positive"}`}
                          >
                            {money(e.amount)}
                            {original.currency !== currency && (
                              <div className="small muted">
                                {formatMoney(original.amount, true, true, original.currency)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="share-actions">
                              <button
                                className="icon-button"
                                onClick={() => setShareCard({ entry: e })}
                                aria-label={t("shareEntry")}
                              >
                                <Share2 size={16} />
                              </button>
                              <button
                                className="icon-button"
                                aria-label={t("editEntry", {
                                  source: t(e.category),
                                  date: e.date,
                                })}
                                onClick={(event) =>
                                  setEditor({
                                    id: e.id,
                                    date: e.date,
                                    entry: original,
                                    trigger: event.currentTarget,
                                  })
                                }
                              >
                                <ArrowUpRight size={16} />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
        <MarketWidget />
        <footer className="footer">
          <span>
            <span className="footer-brand">pnl.</span>{" "}
            <span className="muted">{t("footer")}</span>
          </span>
          <span className="muted">
            {demo ? t("demoFooter") : t("journalFooter")}
          </span>
        </footer>
      </main>
      {shareCard && (
        <ShareDialog
          entries={records}
          currency={currency}
          rateDate={needsConversion ? exchange?.date : undefined}
          month={month}
          range={range}
          entry={shareCard.entry ? records.find((entry) => entry.id === shareCard.entry?.id) : undefined}
          theme={theme}
          demo={demo}
          onClose={() => setShareCard(null)}
        />
      )}
      {editor && (
        <EntryEditor
          key={editor.id}
          date={editor.date}
          id={editor.id}
          initial={editor.entry}
          demo={demo}
          onClose={() => setEditor(null)}
          onRestoreFocus={() => {
            const target = editor.trigger.isConnected ? editor.trigger : addEntryButton.current;
            target?.focus();
          }}
          onSave={save}
          onDelete={remove}
        />
      )}
      <Toaster
        theme={theme as "dark" | "light"}
        toastOptions={{ style: { borderRadius: 0, fontFamily: "monospace" } }}
      />
    </div>
  );
}
