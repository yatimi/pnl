"use client";
// Created by Tommy.
import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { renderShareCard } from "@/lib/share-card";
import { monthLabel, type Currency, type Entry } from "@/lib/journal";
import { useLanguage } from "./language-provider";

export default function ShareDialog({
  entries,
  currency,
  rateDate,
  month,
  entry,
  theme,
  demo,
  onClose,
}: {
  entries: Entry[];
  currency: Currency;
  rateDate?: string;
  month: string;
  entry?: Entry;
  theme: string;
  demo: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const filename = `pnl-${entry?.date ?? month}${entry ? "-" + entry.id.slice(0, 8) : ""}.png`;
  useEffect(() => {
    let cancelled = false;
    setBlob(null);
    setError(false);
    if (canvas)
      renderShareCard(canvas, {
        entries,
        currency,
        rateDate,
        month,
        entry,
        light: theme === "light",
        period: entry
          ? new Date(entry.date + "T12:00:00Z").toLocaleDateString(locale, {
              dateStyle: "long",
              timeZone: "UTC",
            })
          : monthLabel(month, locale),
        label: entry ? t(entry.category) : t("tradingPnl"),
        footer: t("shareFooter"),
        demoLabel: demo ? t("demoHeading") : "",
        countLabel: t("shareSingleEntry"),
        daysLabel: t("shareRecordedDays"),
      })
        .then((value) => {
          if (!cancelled) setBlob(value);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    return () => {
      cancelled = true;
    };
  }, [canvas, currency, rateDate, entries, month, entry, theme, demo, locale, t]);
  function download() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function share() {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    if (!navigator.canShare?.({ files: [file] })) {
      download();
      return;
    }
    setSharing(true);
    setError(false);
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(true);
    } finally {
      setSharing(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="entry-dialog share-dialog"
        showCloseButton={false}
      >
        <DialogClose asChild>
          <button className="entry-close" aria-label={t("close")}>
            <X size={16} />
          </button>
        </DialogClose>
        <DialogTitle className="dialog-title">{t("shareTitle")}</DialogTitle>
        <DialogDescription>{t("shareHint")}</DialogDescription>
        <canvas
          ref={setCanvas}
          className="share-preview"
          role="img"
          aria-label={t("sharePreview")}
        />
        {error && (
          <p role="alert" className="negative">
            {t("shareFailed")}
          </p>
        )}
        <div className="share-actions">
          <button
            className="primary-button"
            disabled={!blob || sharing}
            onClick={download}
          >
            <Download size={18} />
            {t("savePng")}
          </button>
          <button
            className="icon-button"
            disabled={!blob || sharing}
            onClick={share}
            aria-label={t("shareTitle")}
          >
            <Share2 size={18} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
