// Created by Tommy.
import { getDatabase } from "./index";
import { moveMonth, type Entry } from "../lib/journal";
export async function listEntries(
  userId: string,
  month: string,
): Promise<Entry[]> {
  const result = await getDatabase()
    .prepare(
      "SELECT id, date, category, amount, note FROM journal_entries WHERE user_id = ? AND date >= ? AND date < ? ORDER BY date DESC, category, id",
    )
    .bind(userId, moveMonth(month, -11) + "-01", moveMonth(month, 1) + "-01")
    .all<Entry>();
  return result.results;
}
export async function saveEntry(userId: string, entry: Entry) {
  await getDatabase()
    .prepare(
      "INSERT INTO journal_entries (user_id, id, date, category, amount, note) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, id) DO UPDATE SET date = excluded.date, category = excluded.category, amount = excluded.amount, note = excluded.note",
    )
    .bind(
      userId,
      entry.id,
      entry.date,
      entry.category,
      entry.amount,
      entry.note,
    )
    .run();
}
export async function deleteEntry(userId: string, id: string) {
  await getDatabase()
    .prepare("DELETE FROM journal_entries WHERE user_id = ? AND id = ?")
    .bind(userId, id)
    .run();
}
