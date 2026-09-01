import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { moodEventTypeEnum } from "./enums";
import { usersTable } from "./users";

/**
 * 用户情绪事件（调色盘 / 粉碎机 / 社交气泡）。
 * payload 按事件类型存放附加字段，避免为每类事件建窄表：
 *   - palette:  { dominantColor?, dominantLabel?, ratio? }
 *   - shredder: { emotion?, length }
 *   - bubble:   { scene, rolesCount }
 */
export const moodEventsTable = pgTable(
  "mood_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: moodEventTypeEnum("type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // 按用户 + 时间维度查询（日记页 7 天趋势、最近记录）
    index("mood_events_user_occurred_idx").on(table.userId, table.occurredAt),
  ],
);

export type MoodEvent = typeof moodEventsTable.$inferSelect;
export type NewMoodEvent = typeof moodEventsTable.$inferInsert;
