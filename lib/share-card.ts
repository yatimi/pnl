// Created by Tommy.
import { daysInMonth, money, summarize, type Entry, type Currency } from "./journal";

export type ShareCard = {
  month: string;
  currency: Currency;
  rateDate?: string;
  entries: Entry[];
  entry?: Entry;
  light: boolean;
  period: string;
  label: string;
  footer: string;
  demoLabel: string;
  countLabel: string;
  daysLabel: string;
};

export async function renderShareCard(
  canvas: HTMLCanvasElement,
  card: ShareCard,
): Promise<Blob> {
  await document.fonts.load("48px Pixelify");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  canvas.width = 1200;
  canvas.height = 1200;
  const bg = card.light ? "#f4f5ef" : "#101210";
  const ink = card.light ? "#232820" : "#eff1e9";
  const muted = card.light ? "#626b59" : "#92998b";
  const grid = card.light ? "#d4dacb" : "#2b3028";
  const gain = card.light ? "#284c17" : "#b6f36b";
  const loss = card.light ? "#a63e3a" : "#ef9792";
  const stats = summarize(card.entries, card.month);
  const value = card.entry?.amount ?? stats.total;
  const accent = value < 0 ? loss : gain;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 1200);
  ctx.strokeStyle = grid;
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, 1136, 1136);
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = ink,
    pixel = false,
    width = 1040,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${size}px ${pixel ? "Pixelify" : "monospace"}`;
    while (ctx.measureText(value).width > width && size > 16) {
      size -= 2;
      ctx.font = `${size}px ${pixel ? "Pixelify" : "monospace"}`;
    }
    ctx.fillText(value, x, y);
  };
  text("pnl.", 80, 155, 92, accent, true);
  text(card.demoLabel, 790, 125, 25, muted, false, 330);
  text(card.period.toUpperCase(), 80, 255, 30, muted);
  text(card.label.toUpperCase(), 80, 337, 27, muted);
  text(money(value, true, true, card.currency), 72, 472, 132, accent, true);
  text(card.currency + (card.rateDate ? ` · NBU ${card.rateDate}` : ""), 80, 526, 25, muted);
  if (!card.entry) {
    const days = daysInMonth(card.month);
    let cumulative = 0;
    const points = [
      0,
      ...Array.from({ length: days }, (_, i) => {
        cumulative +=
          stats.daily.get(`${card.month}-${String(i + 1).padStart(2, "0")}`) ??
          0;
        return cumulative;
      }),
    ];
    const low = Math.min(0, ...points),
      high = Math.max(0, ...points);
    const y = (v: number) =>
      high === low ? 737 : 855 - ((v - low) / (high - low)) * 235;
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(80, 620 + i * 59);
      ctx.lineTo(1120, 620 + i * 59);
      ctx.stroke();
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(80, y(0));
    points.slice(1).forEach((v, i) => {
      const x = 80 + ((i + 1) / days) * 1040;
      ctx.lineTo(x, y(points[i]));
      ctx.lineTo(x, y(v));
    });
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(1110, y(value) - 10, 20, 20);
    text(`01 — ${days}`, 80, 915, 24, muted);
    text(`${stats.active} ${card.daysLabel}`, 650, 915, 24, muted, false, 470);
  } else {
    // Pixel divider; a single entry has no price history to chart.
    ctx.fillStyle = grid;
    ctx.fillRect(80, 730, 1040, 4);
    ctx.fillStyle = accent;
    for (let i = 0; i < 16; i++) ctx.fillRect(80 + i * 66, 630, 50, 100);
    text(card.countLabel, 80, 840, 30, muted);
  }
  ctx.fillStyle = grid;
  ctx.fillRect(80, 1000, 1040, 2);
  text(card.footer, 80, 1080, 24, muted);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG unavailable"))),
      "image/png",
    ),
  );
}
