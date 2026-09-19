// Created by Tommy.
import test from "node:test";
import assert from "node:assert/strict";
import { marketLeaders } from "../lib/market.ts";
const symbol = (baseAsset, overrides = {}) => ({ symbol: baseAsset + "USDT", baseAsset, quoteAsset: "USDT", status: "TRADING", isSpotTradingAllowed: true, ...overrides });
const ticker = (asset, change, overrides = {}) => ({ symbol: asset + "USDT", lastPrice: "0.00000123", priceChangePercent: String(change), quoteVolume: "1000000", ...overrides });
test("market leaders use active liquid spot USDT pairs and separate positive and negative changes", () => {
  const exchange = { symbols: [symbol("GAIN"), symbol("LOSS"), symbol("FLAT"), symbol("LOW"), symbol("HALT", { status: "HALT" }), symbol("BTC", { quoteAsset: "BTC" }), symbol("BAD"), symbol("MARGIN", { isSpotTradingAllowed: false })] };
  const result = marketLeaders(exchange, [ticker("GAIN", 12), ticker("LOSS", -8), ticker("FLAT", 0), ticker("LOW", 99, { quoteVolume: "999999" }), ticker("HALT", 100), ticker("BTC", 100), ticker("BAD", "NaN"), ticker("MARGIN", 999)]);
  assert.deepEqual(result.gainers.map((r) => r.asset), ["GAIN"]);
  assert.deepEqual(result.losers.map((r) => r.asset), ["LOSS"]);
  assert.equal(result.gainers[0].price, "0.00000123");
});
test("leaders are capped at five and sorted in the correct direction", () => {
  const assets = Array.from({ length: 12 }, (_, i) => "COIN" + i);
  const result = marketLeaders({ symbols: assets.map((a) => symbol(a)) }, assets.map((a, i) => ticker(a, i < 6 ? i + 1 : -i)));
  assert.deepEqual(result.gainers.map((r) => r.change), [6, 5, 4, 3, 2]);
  assert.deepEqual(result.losers.map((r) => r.change), [-11, -10, -9, -8, -7]);
  assert.throws(() => marketLeaders({}, []));
  assert.throws(() => marketLeaders({ symbols: [] }, []));
});
