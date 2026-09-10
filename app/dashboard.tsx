"use client";
// Created by Tommy.
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
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
import EntryEditor from "./entry-editor";
import EquityChart from "./equity-chart";
import {
  categories,
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
  type Category,
} from "@/lib/journal";
const weekdays = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const result = (await response
    .json()
    .catch(() => ({ error: "Сервер недоступен. Попробуй ещё раз." }))) as {
    error?: string;
    entries?: Entry[];
  };
  if (!response.ok)
    throw new Error(result.error ?? "Не удалось выполнить запрос.");
  return result;
}
export default function Dashboard() {
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [entries, setEntries] = useState<Entry[]>([]),
    [demo, setDemo] = useState(false),
    [demoData, setDemoData] = useState<Entry[]>([]);
  const [theme, setTheme] = useState("dark"),
    [view, setView] = useState("calendar");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<{
    date: string;
    category: Category;
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
          throw new Error("Получены некорректные данные. Повтори загрузку.");
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
  const records = demo ? demoData : entries;
  const stats = summarize(records, month),
    prev = summarize(records, moveMonth(month, -1));
  const current = records
    .filter((e) => e.date.startsWith(month))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.category.localeCompare(b.category),
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
  function openDay(date: string, category: Category = "trading") {
    setEditor({ date, category });
  }
  function toggleDemo() {
    if (demo) {
      setDemo(false);
      setMonth(localDate().slice(0, 7));
    } else {
      const m = moveMonth(localDate().slice(0, 7), -1);
      setDemoData(demoEntries(m));
      setMonth(m);
      setDemo(true);
    }
  }
  async function save(entry: Entry) {
    if (!demo)
      await api("/api/entries", { method: "PUT", body: JSON.stringify(entry) });
    const update = (old: Entry[]) => [
      ...old.filter(
        (e) => !(e.date === entry.date && e.category === entry.category),
      ),
      entry,
    ];
    if (demo) setDemoData(update);
    else setEntries(update);
    setMonth(entry.date.slice(0, 7));
    toast.success(demo ? "Пробная запись добавлена" : "Запись сохранена");
  }
  async function remove(date: string, category: Category) {
    if (!demo)
      await api(`/api/entries?date=${date}&category=${category}`, {
        method: "DELETE",
      });
    const update = (old: Entry[]) =>
      old.filter((e) => !(e.date === date && e.category === category));
    if (demo) setDemoData(update);
    else setEntries(update);
    toast.success("Запись удалена");
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
          title: "Открыть месяц дневника",
          description: "Открывает календарь PnL за месяц. Не создаёт записи.",
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
              throw new Error("Ожидается месяц YYYY-MM.");
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
  }, []);
  const metric = (value: string) => (unavailable ? "—" : value);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="PNL — главная">
          pnl<span className="brand-pixel">.</span>
        </a>
        <span className="header-caption">ЛИЧНЫЙ ДНЕВНИК</span>
        <div className="header-actions">
          <button
            className={"demo-button " + (demo ? "is-demo" : "")}
            onClick={toggleDemo}
          >
            {demo ? "Мой дневник" : "Демо"}
          </button>
          <button
            className="icon-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={
              theme === "dark"
                ? "Включить светлую тему"
                : "Включить тёмную тему"
            }
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">ДЕНЬ ЗА ДНЁМ</p>
            <h1>
              Всё складывается<span className="positive">.</span>
            </h1>
            <p className="muted">Твои результаты. Без лишнего шума.</p>
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
            <Plus size={18} /> Записать день
          </button>
        </div>
        {demo && (
          <div className="preview-notice">
            <span className="positive">ПРИМЕР ДНЕВНИКА</span>
            <span>Можно попробовать ввод. Демо не попадёт в твои записи.</span>
          </div>
        )}
        <Tabs value={view} onValueChange={setView} className="journal-tabs">
          <div className="toolbar">
            <TabsList variant="line" className="view-tabs">
              <TabsTrigger value="calendar">
                <CalendarDays />
                Календарь
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <ChartNoAxesColumnIncreasing />
                Аналитика
              </TabsTrigger>
              <TabsTrigger value="entries">
                <List />
                Записи
              </TabsTrigger>
            </TabsList>
            <div className="month-switch">
              <button
                className="icon-button"
                disabled={month === "2000-01"}
                onClick={() => setMonth(moveMonth(month, -1))}
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft size={18} />
              </button>
              <span>{monthLabel(month)}</span>
              <button
                className="icon-button"
                disabled={month === "2099-12"}
                onClick={() => setMonth(moveMonth(month, 1))}
                aria-label="Следующий месяц"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <span className="currency-label">USD / $</span>
          </div>
          {loading && (
            <p role="status" className="status-message">
              Загружаем дневник…
            </p>
          )}
          {error && (
            <div className="status-message form-error" role="alert">
              {error}
              <button
                className="text-button"
                onClick={() => setReload((v) => v + 1)}
              >
                Повторить
              </button>
            </div>
          )}
          <section className="stats-grid" aria-label="Итоги месяца">
            <div className="stat">
              <p>Результат месяца</p>
              <strong className={stats.total < 0 ? "negative" : "positive"}>
                {metric(money(stats.total))}
              </strong>
              <span>
                {!unavailable && prev.active > 0
                  ? `${money(stats.total - prev.total)} к прошлому месяцу`
                  : "Торговый PnL"}
              </span>
            </div>
            <div className="stat">
              <p>Прибыльных дней</p>
              <strong>
                {metric(stats.active ? String(stats.winRate) : "—")}
                <span className="unit">%</span>
              </strong>
              <span>
                {unavailable
                  ? "…"
                  : `${stats.wins} из ${stats.active} записанных дней`}
              </span>
            </div>
            <div className="stat">
              <p>Лучший день</p>
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
                      "ru-RU",
                      { day: "numeric", month: "long", timeZone: "UTC" },
                    )
                  : "Пока нет записей"}
              </span>
            </div>
            <div className="stat">
              <p>Другие доходы</p>
              <strong>{metric(money(stats.income, false))}</strong>
              <span>Зарплата и остальное</span>
            </div>
          </section>
          {!unavailable && (
            <>
              <TabsContent value="calendar">
                <EquityChart entries={records} month={month} />
                <section className="calendar-panel">
                  <div className="section-heading">
                    <h2>Календарь PnL</h2>
                    <div className="calendar-legend small">
                      <span className="positive">▪ Прибыль</span>
                      <span className="negative">▪ Убыток</span>
                      <span className="muted">· Нет записи</span>
                    </div>
                  </div>
                  {current.length === 0 && (
                    <div className="empty-hint">
                      <span>Первая запись — начало картины.</span> Нажми на день
                      и добавь результат.
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
                          aria-label={`${day}, ${monthLabel(month)}: ${value === undefined ? "нет торговой записи" : money(value)}${income ? `, другие доходы ${money(income)}` : ""}. Открыть запись.`}
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
                              title={`Другие доходы: ${money(income)}`}
                            >
                              +$
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="calendar-footnote">
                    +$ — другой доход. Цвет дня и график показывают только
                    трейдинг.
                  </p>
                </section>
              </TabsContent>
              <TabsContent value="analytics">
                <EquityChart entries={records} month={month} />
                <div className="analytics-grid">
                  <section className="insight-panel">
                    <p className="eyebrow">СВОДКА МЕСЯЦА</p>
                    <h2>
                      {stats.active === 0
                        ? "Пока не хватает записей"
                        : stats.total > prev.total && prev.active
                          ? "Результат стал лучше"
                          : stats.total > 0
                            ? "Месяц в плюсе"
                            : stats.total < 0
                              ? "Месяц в минусе"
                              : "Вышли в ноль"}
                    </h2>
                    <p>
                      {stats.active === 0
                        ? "Добавь хотя бы один торговый день — здесь появятся выводы по твоим цифрам."
                        : `За ${stats.active} записанных дней торговый результат составил ${money(stats.total)}. Прибыльных дней — ${stats.wins}, убыточных — ${stats.losses}, без изменения — ${stats.active - stats.wins - stats.losses}.`}
                    </p>
                    {prev.active > 0 && stats.active > 0 && (
                      <p>
                        Изменение к предыдущему месяцу:{" "}
                        <span
                          className={
                            stats.total - prev.total < 0
                              ? "negative"
                              : "positive"
                          }
                        >
                          {money(stats.total - prev.total)}
                        </span>
                        . Сравнение учитывает только записанные дни; месяцы
                        могут быть заполнены не полностью.
                      </p>
                    )}
                    <span className="small muted">
                      Автоматический расчёт по записям, без AI-прогноза.
                    </span>
                  </section>
                  <section className="insight-panel">
                    <p className="eyebrow">В ДЕТАЛЯХ</p>
                    <dl className="detail-metrics">
                      <div>
                        <dt>Средний торговый день</dt>
                        <dd>
                          {stats.active
                            ? money(Math.round(stats.total / stats.active))
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>Максимальная просадка</dt>
                        <dd>{stats.active ? money(-stats.drawdown) : "—"}</dd>
                      </div>
                      <div>
                        <dt>Трейдинг + другие доходы</dt>
                        <dd>{money(stats.total + stats.income)}</dd>
                      </div>
                    </dl>
                    <p className="small muted">
                      Просадка — максимальное снижение накопленного PnL от пика
                      внутри месяца, начиная с нуля.
                    </p>
                  </section>
                </div>
                <section className="month-history">
                  <div className="section-heading">
                    <h2>Последние 12 месяцев</h2>
                    <span className="small muted">Торговый PnL</span>
                  </div>
                  <div className="monthly-bars">
                    {monthlyStats.map((s) => {
                      const m = s.month;
                      return (
                        <button
                          key={m}
                          onClick={() => setMonth(m)}
                          className="month-bar"
                          aria-label={`${monthLabel(m)}: ${money(s.total)}. Открыть месяц.`}
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
                              .toLocaleDateString("ru-RU", { month: "short" })
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
                  <h2>Записи за месяц</h2>
                  <span className="small muted">{current.length} записей</span>
                </div>
                {current.length === 0 ? (
                  <div className="empty-records">
                    <CalendarDays size={28} />
                    <h2>Здесь начинается твоя история</h2>
                    <p className="muted">
                      Добавь результат дня. Даже если он нулевой.
                    </p>
                    <button
                      className="primary-button"
                      onClick={() => openDay(month + "-01")}
                    >
                      <Plus size={18} /> Первая запись
                    </button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Дата</TableHead>
                        <TableHead>Источник</TableHead>
                        <TableHead>Заметка</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                        <TableHead>
                          <span className="sr-only">Действие</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {current.map((e) => (
                        <TableRow key={e.date + e.category}>
                          <TableCell className="mono">
                            {e.date.slice(8)}.{e.date.slice(5, 7)}
                          </TableCell>
                          <TableCell>{categories[e.category]}</TableCell>
                          <TableCell className="note-cell muted">
                            {e.note || "—"}
                          </TableCell>
                          <TableCell
                            className={`mono text-right ${e.amount < 0 ? "negative" : "positive"}`}
                          >
                            {money(e.amount)}
                          </TableCell>
                          <TableCell>
                            <button
                              className="icon-button"
                              aria-label={`Редактировать ${categories[e.category]} за ${e.date}`}
                              onClick={() => openDay(e.date, e.category)}
                            >
                              <ArrowUpRight size={16} />
                            </button>
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
            <span className="muted">Маленькие записи. Большая картина.</span>
          </span>
          <span className="muted">
            {demo ? "Демо / данные для примера" : "Личный дневник / USD"}
          </span>
        </footer>
      </main>
      {editor && (
        <EntryEditor
          key={editor.date + editor.category}
          date={editor.date}
          category={editor.category}
          entries={records}
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
