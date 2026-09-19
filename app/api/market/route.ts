// Created by Tommy.
import { marketLeaders, type MarketSnapshot } from "@/lib/market";
export const dynamic = "force-dynamic";
let cached: { value: MarketSnapshot; expires: number } | undefined;
let pending: Promise<MarketSnapshot> | undefined;
let exchange: { value: unknown; expires: number } | undefined;
async function fetchMarket(path: string) {
  const response = await fetch(`https://data-api.binance.vision/api/v3/${path}`, {
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Market provider unavailable");
  return response.json();
}
async function refresh() {
  const [info, tickers] = await Promise.all([
    exchange && exchange.expires > Date.now() ? exchange.value : fetchMarket("exchangeInfo?permissions=SPOT&symbolStatus=TRADING&showPermissionSets=false"),
    fetchMarket("ticker/24hr"),
  ]);
  const value = marketLeaders(info, tickers);
  if (!exchange || exchange.expires <= Date.now()) exchange = { value: info, expires: Date.now() + 3600000 };
  cached = { value, expires: Date.now() + 60000 };
  return value;
}
// Public market data only; journal records and user identifiers never leave the server.
export async function GET() {
  try {
    if (!cached || cached.expires <= Date.now()) {
      pending ??= refresh().finally(() => { pending = undefined; });
      await pending;
    }
    return Response.json(cached!.value, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
  } catch {
    return Response.json({ error: "marketUnavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
