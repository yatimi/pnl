// Created by Tommy.
import test from "node:test";
import assert from "node:assert/strict";
import {
  messages,
  translate,
  isLanguage,
  isTranslationKey,
} from "../lib/i18n.ts";
import { monthLabel, categories } from "../lib/journal.ts";

test("both languages cover the same messages and interpolation values", () => {
  assert.deepEqual(
    Object.keys(messages.en).sort(),
    Object.keys(messages.ru).sort(),
  );
  const placeholders = (text) =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const key of Object.keys(messages.en)) {
    assert.ok(messages.en[key].trim());
    assert.ok(messages.ru[key].trim());
    assert.deepEqual(
      placeholders(messages.en[key]),
      placeholders(messages.ru[key]),
      key,
    );
    assert.doesNotMatch(messages.en[key], /[\u0400-\u04ff]/, key);
  }
});
test("summary values remain unchanged when switching languages", () => {
  const values = { active: 3, total: "−$20.00", wins: 1, losses: 2, flat: 0 };
  for (const language of ["en", "ru"]) {
    const result = translate(language, "summaryBody", values);
    assert.ok(result.includes(values.total));
    assert.doesNotMatch(result, /\{\w+\}/);
  }
  assert.equal(
    translate("en", "winningDays", { wins: 0, active: 3 }),
    "0 of 3 recorded days",
  );
});
test("language and error-code guards reject inherited or unsupported values", () => {
  for (const value of [null, "de", "EN", "toString"])
    assert.equal(isLanguage(value), false);
  assert.equal(isLanguage("en"), true);
  assert.equal(isLanguage("ru"), true);
  assert.equal(isTranslationKey("toString"), false);
  assert.equal(isTranslationKey("authRequired"), true);
});
test("dates and income sources are localized without changing stored keys", () => {
  assert.equal(monthLabel("2026-09", "en-US"), "September 2026");
  assert.equal(monthLabel("2026-09", "ru-RU"), "сентябрь 2026");
  for (const category of Object.keys(categories)) {
    assert.ok(messages.en[category]);
    assert.ok(messages.ru[category]);
  }
});
