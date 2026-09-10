import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pnl. — личный дневник",
  description:
    "Доходы и убытки по дням. Календарь, графики и месячная статистика.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
