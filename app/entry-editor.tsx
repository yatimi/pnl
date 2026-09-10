"use client";
// Created by Tommy.
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  categories,
  daysInMonth,
  parseAmount,
  validDate,
  type Entry,
  type Category,
} from "@/lib/journal";
export default function EntryEditor({
  date: initialDate,
  category: initialCategory,
  entries,
  demo,
  onClose,
  onSave,
  onDelete,
}: {
  date: string;
  category: Category;
  entries: Entry[];
  demo: boolean;
  onClose: () => void;
  onSave: (entry: Entry) => Promise<void>;
  onDelete: (date: string, category: Category) => Promise<void>;
}) {
  const initial = entries.find(
    (e) => e.date === initialDate && e.category === initialCategory,
  );
  const [date, setDate] = useState(initialDate),
    [category, setCategory] = useState<Category>(initialCategory);
  const [amount, setAmount] = useState(
      initial ? String(Math.abs(initial.amount) / 100) : "",
    ),
    [sign, setSign] = useState(initial && initial.amount < 0 ? "loss" : "gain"),
    [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const existing = entries.find(
    (e) => e.date === date && e.category === category,
  );
  function selectRecord(nextDate: string, nextCategory: Category) {
    const next = entries.find(
      (e) => e.date === nextDate && e.category === nextCategory,
    );
    setDate(nextDate);
    setCategory(nextCategory);
    setAmount(next ? String(Math.abs(next.amount) / 100) : "");
    setNote(next?.note ?? "");
    setSign(next && next.amount < 0 ? "loss" : "gain");
    setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const minor = parseAmount(amount);
    if (
      minor === null ||
      !validDate(date) ||
      !date.startsWith(initialDate.slice(0, 7))
    ) {
      setError(
        "Введи корректную дату и сумму: до 9 цифр и 2 знаков после запятой.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({
        date,
        category,
        amount: category === "trading" && sign === "loss" ? -minor : minor,
        note,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить запись.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onDelete(date, category);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить запись.");
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="entry-dialog"
        showCloseButton={!busy}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="dialog-title">
          {existing ? "Запись дня" : "Как прошёл день?"}
        </DialogTitle>
        <DialogDescription>
          {demo
            ? "Пробная запись. Не сохраняется в личный дневник."
            : "Сумма в USD после комиссий. Заметка — по желанию."}
        </DialogDescription>
        <form onSubmit={submit} className="entry-form">
          <fieldset disabled={busy}>
            <div className="form-row">
              <label>
                Дата
                <input
                  type="date"
                  value={date}
                  required
                  min={initialDate.slice(0, 7) + "-01"}
                  max={
                    initialDate.slice(0, 7) +
                    "-" +
                    daysInMonth(initialDate.slice(0, 7))
                  }
                  onChange={(e) => selectRecord(e.target.value, category)}
                />
              </label>
              <div className="field">
                <span id="category-label">Источник</span>
                <Select
                  value={category}
                  onValueChange={(v) => selectRecord(date, v as Category)}
                  disabled={busy}
                >
                  <SelectTrigger aria-labelledby="category-label">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categories).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {category === "trading" && (
              <RadioGroup
                className="sign-options"
                value={sign}
                onValueChange={setSign}
                aria-label="Результат дня"
              >
                <label
                  className={sign === "gain" ? "selected gain-choice" : ""}
                >
                  <RadioGroupItem value="gain" /> + Прибыль
                </label>
                <label
                  className={sign === "loss" ? "selected loss-choice" : ""}
                >
                  <RadioGroupItem value="loss" /> − Убыток
                </label>
              </RadioGroup>
            )}
            <label>
              Сумма, USD
              <div className="amount-field">
                <span>
                  {sign === "loss" && category === "trading" ? "−" : "+"}$
                </span>
                <input
                  aria-label="Сумма в долларах"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  autoFocus
                  maxLength={12}
                />
              </div>
            </label>
            <label>
              Заметка <span className="muted small">необязательно</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Что стоит запомнить?"
                rows={3}
                maxLength={500}
              />
            </label>
            <p className="small muted">
              {existing
                ? "Сохранение обновит запись этого источника за выбранный день."
                : "За день можно записать трейдинг, зарплату и другой доход отдельно."}
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              {existing && (
                <button
                  type="button"
                  className="text-button negative"
                  onClick={() => setConfirmDelete(true)}
                >
                  Удалить
                </button>
              )}
              <button type="submit" className="primary-button">
                {busy ? "Сохраняем…" : "Сохранить запись"}
              </button>
            </div>
          </fieldset>
        </form>
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
              <AlertDialogDescription>
                Будет удалён только источник «{categories[category]}» за {date}.
                Другие записи останутся.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault();
                  void remove();
                }}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
