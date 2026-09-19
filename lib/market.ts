// Created by Tommy.
export type MarketTicker = { symbol: string; asset: string; price: string; change: number };
export type MarketSnapshot = { updatedAt: string; gainers: MarketTicker[]; losers: MarketTicker[] };
export function marketLeaders(exchange: unknown, tickers: unknown): MarketSnapshot {
  const info = exchange as { symbols?: { symbol: string; baseAsset: string; quoteAsset: string; status: string; isSpotTradingAllowed: boolean }[] };
  if (!Array.isArray(info?.symbols) || !Array.isArray(tickers)) throw new Error("Invalid market data");
  const assets = new Map(info.symbols.filter((s) => s.quoteAsset === "USDT" && s.status === "TRADING" && s.isSpotTradingAllowed).map((s) => [s.symbol, s.baseAsset]));
  const rows: MarketTicker[] = tickers.filter((row) => assets.has(row.symbol) &&
    typeof row.lastPrice === "string" && Number.isFinite(Number(row.lastPrice)) && Number(row.lastPrice) > 0 &&
    typeof row.priceChangePercent === "string" && Number.isFinite(Number(row.priceChangePercent)) &&
    Number.isFinite(Number(row.quoteVolume)) && Number(row.quoteVolume) >= 1000000)
    .map((row) => ({ symbol: row.symbol, asset: assets.get(row.symbol)!, price: row.lastPrice, change: Number(row.priceChangePercent) }));
  if (!rows.length) throw new Error("No market data");
  return { updatedAt: new Date().toISOString(),
    gainers: rows.filter((row) => row.change > 0).sort((a, b) => b.change - a.change || a.symbol.localeCompare(b.symbol)).slice(0, 5),
    losers: rows.filter((row) => row.change < 0).sort((a, b) => a.change - b.change || a.symbol.localeCompare(b.symbol)).slice(0, 5) };
}
