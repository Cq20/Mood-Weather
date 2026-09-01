import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** 心境日记条目（用户敏感数据，一律按 userId 隔离） */
export const journalEntriesTable = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    moodLabel: text("mood_label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("journal_entries_user_idx").on(table.userId)],
);

export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type NewJournalEntry = typeof journalEntriesTable.$inferInsert;
