import { pgEnum } from "drizzle-orm/pg-core";

/** 情绪事件类型（对应前端 tracker 的三种记录） */
export const moodEventTypeEnum = pgEnum("mood_event_type", [
  "palette",
  "shredder",
  "bubble",
]);
