// Created by Tommy.
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: text("id")
      .notNull()
      .default(sql`(lower(hex(randomblob(16))))`),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    category: text("category", {
      enum: ["trading", "salary", "other"],
    }).notNull(),
    amount: integer("amount").notNull(),
    note: text("note").notNull().default(""),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("journal_entries_user_date_idx").on(table.userId, table.date),
  ],
);
