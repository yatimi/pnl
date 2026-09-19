// Created by Tommy.
import { getDatabase } from "./index";
import { moveMonth, validateEntry, type Entry } from "../lib/journal";
export async function listEntries(userId: string, month: string, all = false): Promise<Entry[]> {
  const database = await getDatabase();
  const entries: Entry[] = [];
  // PostgREST caps a response; fetch every page before computing journal totals.
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = database.from("journal_entries")
      .select("id,date,category,amount,currency,note")
      .eq("user_id", userId)
      .order("date", { ascending: false }).order("category").order("id")
      .range(offset, offset + pageSize - 1);
    if (!all) query = query.gte("date", moveMonth(month, -11) + "-01").lt("date", moveMonth(month, 1) + "-01");
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data) {
      const entry = validateEntry(row);
      if (!entry) throw new Error("Invalid journal record");
      entries.push(entry);
    }
    if (data.length < pageSize) return entries;
  }
}
export async function saveEntry(userId: string, entry: Entry) {
  const database = await getDatabase();
  const { error } = await database.from("journal_entries")
    .upsert({ ...entry, user_id: userId }, { onConflict: "user_id,id" });
  if (error) throw error;
}
export async function deleteEntry(userId: string, id: string) {
  const database = await getDatabase();
  const { error } = await database.from("journal_entries").delete()
    .eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
