// Created by Tommy.
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const journalEntries = sqliteTable(
  "journal_entries",
  {
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    category: text("category", {
      enum: ["trading", "salary", "other"],
    }).notNull(),
    amount: integer("amount").notNull(),
    note: text("note").notNull().default(""),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.date, table.category] }),
  ],
);
