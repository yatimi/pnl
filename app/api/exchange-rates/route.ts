// Created by Tommy.
import { parseExchangeRates, type ExchangeRates } from "@/lib/exchange";
export const dynamic = "force-dynamic";
let cached: { value: ExchangeRates; expires: number } | undefined;

// Public market data only: no journal data or user identifiers leave the server.
export async function GET() {
  try {
    if (!cached || cached.expires <= Date.now()) {
      const response = await fetch("https://api.nbp.pl/api/exchangerates/tables/a/?format=json", {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("NBP unavailable");
      cached = { value: parseExchangeRates(await response.json()), expires: Date.now() + 3600000 };
    }
    return Response.json(cached.value, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ error: "ratesUnavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
