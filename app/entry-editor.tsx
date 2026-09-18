"use client";
// Created by Tommy.
import { useState } from "react";
import { X } from "lucide-react";
import { isTranslationKey } from "@/lib/i18n";
import { useLanguage } from "./language-provider";
import {
  Dialog,
  DialogContent,
  DialogClose,
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
  currencies,
  currencySymbols,
  type Currency,
  categories,
  daysInMonth,
  parseAmount,
  validDate,
  type Entry,
  type Category,
} from "@/lib/journal";
export default function EntryEditor({
  date: initialDate,
  id,
  initial,
  demo,
  onClose,
  onRestoreFocus,
  onSave,
  onDelete,
}: {
  date: string;
  id: string;
  initial?: Entry;
  demo: boolean;
  onClose: () => void;
  onRestoreFocus: () => void;
  onSave: (entry: Entry) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [date, setDate] = useState(initialDate),
    [category, setCategory] = useState<Category>(
      initial?.category ?? "trading",
    );
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "USD");
  const [amount, setAmount] = useState(
      initial ? String(Math.abs(initial.amount) / 100) : "",
    ),
    [sign, setSign] = useState(initial && initial.amount < 0 ? "loss" : "gain"),
    [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const existing = initial;
  function selectRecord(nextDate: string, nextCategory: Category) {
    setDate(nextDate);
    setCategory(nextCategory);
    if (nextCategory !== "trading") setSign("gain");
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
      setError("invalidAmount");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({
        id,
        date,
        category,
        amount: category === "trading" && sign === "loss" ? -minor : minor,
        note,
        currency,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "saveFailed");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onDelete(id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "deleteFailed");
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
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <DialogClose asChild>
          <button
            className="entry-close"
            type="button"
            disabled={busy}
            aria-label={t("close")}
          >
            <X size={16} />
          </button>
        </DialogClose>
        <div className="entry-header">
          <DialogTitle className="dialog-title">
            {existing ? t("dayEntry") : t("newDay")}
          </DialogTitle>
          <DialogDescription>
            {demo ? t("demoEntryHint") : t("entryHint")}
          </DialogDescription>
        </div>
        <form onSubmit={submit} className="entry-form">
          <div className="entry-fields">
            <fieldset disabled={busy}>
              <div className="form-row">
                <label>
                  {t("date")}
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
                  <span id="category-label">{t("source")}</span>
                  <Select
                    value={category}
                    onValueChange={(v) => selectRecord(date, v as Category)}
                    disabled={busy}
                  >
                    <SelectTrigger aria-labelledby="category-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categories).map(([key]) => (
                        <SelectItem key={key} value={key}>
                          {t(key as Category)}
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
                  aria-label={t("dayResult")}
                >
                  <label
                    className={sign === "gain" ? "selected gain-choice" : ""}
                  >
                    <RadioGroupItem value="gain" /> {t("profit")}
                  </label>
                  <label
                    className={sign === "loss" ? "selected loss-choice" : ""}
                  >
                    <RadioGroupItem value="loss" /> {t("loss")}
                  </label>
                </RadioGroup>
              )}
              <div className="field">
                <span id="entry-currency-label">{t("entryCurrency")}</span>
                <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)} disabled={busy}>
                  <SelectTrigger aria-labelledby="entry-currency-label"><SelectValue /></SelectTrigger>
                  <SelectContent>{currencies.map((value) => <SelectItem key={value} value={value}>{value} / {currencySymbols[value]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <label>
                {t("amount")} ({currency})
                <div className="amount-field">
                  <span>
                    {sign === "loss" && category === "trading" ? "−" : "+"}{currencySymbols[currency]}
                  </span>
                  <input
                    aria-label={t("amountLabel")}
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
                {t("note")}
                <span className="muted small">{t("optional")}</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("notePlaceholder")}
                  rows={3}
                  maxLength={500}
                />
              </label>
              <p className="small muted">
                {existing ? t("updateHint") : t("sourceHint")}
              </p>
            </fieldset>
          </div>
          <div className="entry-footer">
            {error && (
              <p className="form-error" role="alert">
                {t(isTranslationKey(error) ? error : "requestFailed")}
              </p>
            )}
            <div className="form-actions">
              {existing && (
                <button
                  type="button"
                  className="text-button negative"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t("delete")}
                </button>
              )}
              <button type="submit" className="primary-button" disabled={busy}>
                {busy ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </form>
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDescription", { source: t(category), date })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>
                {t("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault();
                  void remove();
                }}
              >
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
