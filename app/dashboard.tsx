"use client";
// Created by Tommy.
import { useEffect, useState } from "react";
import { isLanguage, isTranslationKey } from "@/lib/i18n";
import { useLanguage } from "./language-provider";
import { flushSync } from "react-dom";
import {
  Share2,
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
import {
  compactMoney,
  daysInMonth,
  demoEntries,
  localDate,
  money,
  monthLabel,
  monthPattern,
  moveMonth,
  summarize,
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
export default function Dashboard() {
  const { language, locale, setLanguage, t } = useLanguage();
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(Date.UTC(2026, 0, 5 + index))
      .toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" })
      .toUpperCase(),
  );
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [entries, setEntries] = useState<Entry[]>([]),
    [demo, setDemo] = useState(false),
    [demoData, setDemoData] = useState<Entry[]>([]);
  const [theme, setTheme] = useState("dark"),
    [view, setView] = useState("calendar");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [shareCard, setShareCard] = useState<{ entry?: Entry } | null>(null);
  const [editor, setEditor] = useState<{
    id: string;
    date: string;
    entry?: Entry;
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
    api(`/api/entries?month=${month}`, { signal: controller.signal })
      .then((data) => {
        if (
          !Array.isArray(data.entries) ||
          !data.entries.every((e) => validateEntry(e))
        )
          throw new Error("invalidData");
        if (!controller.signal.aborted) setEntries(data.entries);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, demo, reload]);
  const records = demo
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
  const stats = summarize(records, month),
    prev = summarize(records, moveMonth(month, -1));
  const current = records
    .filter((e) => e.date.startsWith(month))
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
  const unavailable = loading || !!error;
  function openDay(date: string) {
    setEditor({ id: crypto.randomUUID().replaceAll("-", ""), date });
  }
  function toggleDemo() {
    if (demo) {
      setDemo(false);
      setMonth(localDate().slice(0, 7));
    } else {
      const m = "2026-09";
      setDemoData(demoEntries());
      setMonth(m);
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
          <button
            className="icon-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? t("lightTheme") : t("darkTheme")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
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
            className="primary-button"
            disabled={unavailable}
            onClick={() =>
              openDay(
                month === localDate().slice(0, 7) ? localDate() : month + "-01",
              )
            }
          >
            <Plus size={18} /> {t("addDay")}
          </button>
        </div>
        {demo && (
          <div className="preview-notice">
            <span className="positive">{t("demoHeading")}</span>
            <span>{t("demoHint")}</span>
          </div>
        )}
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
                disabled={month === "2000-01"}
                onClick={() => setMonth(moveMonth(month, -1))}
                aria-label={t("previousMonth")}
              >
                <ChevronLeft size={18} />
              </button>
              <span>{monthLabel(month, locale)}</span>
              <button
                className="icon-button"
                disabled={month === "2099-12"}
                onClick={() => setMonth(moveMonth(month, 1))}
                aria-label={t("nextMonth")}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <span className="currency-label">USD / $</span>
          </div>
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
          <section className="stats-grid" aria-label={t("monthTotals")}>
            <div className="stat">
              <p>{t("monthResult")}</p>
              <strong className={stats.total < 0 ? "negative" : "positive"}>
                {metric(money(stats.total))}
              </strong>
              <span>
                {!unavailable && prev.active > 0
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
              <span>
                {unavailable
                  ? "…"
                  : t("winningDays", {
                      wins: stats.wins,
                      active: stats.active,
                    })}
              </span>
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
            <div className="stat">
              <p>{t("other")}</p>
              <strong>{metric(money(stats.income, false))}</strong>
              <span>{t("salaryAndOther")}</span>
            </div>
          </section>
          {!unavailable && (
            <>
              <TabsContent value="calendar">
                <EquityChart entries={records} month={month} />
                <section className="calendar-panel">
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
                  <div className="calendar-grid">
                    {weekdays.map((d) => (
                      <div className="weekday" key={d}>
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: cells }, (_, i) => {
                      const day = i - offset + 1;
                      if (day < 1 || day > days)
                        return (
                          <div
                            key={i}
                            className="day-cell outside"
                            aria-hidden="true"
                          />
                        );
                      const date = `${month}-${String(day).padStart(2, "0")}`,
                        value = stats.daily.get(date);
                      const income = current
                        .filter(
                          (e) => e.date === date && e.category !== "trading",
                        )
                        .reduce((s, e) => s + e.amount, 0);
                      return (
                        <button
                          key={i}
                          className={`day-cell ${value === undefined ? "" : value > 0 ? "gain" : value < 0 ? "loss" : ""} ${date === localDate() ? "today" : ""}`}
                          onClick={() => openDay(date)}
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
                        </button>
                      );
                    })}
                  </div>
                  <p className="calendar-footnote">{t("calendarFootnote")}</p>
                </section>
              </TabsContent>
              <TabsContent value="analytics">
                <EquityChart entries={records} month={month} />
                <div className="analytics-grid">
                  <section className="insight-panel">
                    <p className="eyebrow">{t("summaryHeading")}</p>
                    <h2>
                      {stats.active === 0
                        ? t("insufficientEntries")
                        : stats.total > prev.total && prev.active
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
                    {prev.active > 0 && stats.active > 0 && (
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
                          onClick={() => setMonth(m)}
                          className="month-bar"
                          aria-label={t("openMonthLabel", {
                            month: monthLabel(m, locale),
                            amount: money(s.total),
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
                      onClick={() => openDay(month + "-01")}
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
                      {current.map((e) => (
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
                                onClick={() =>
                                  setEditor({
                                    id: e.id,
                                    date: e.date,
                                    entry: e,
                                  })
                                }
                              >
                                <ArrowUpRight size={16} />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
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
          month={month}
          entry={shareCard.entry}
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
