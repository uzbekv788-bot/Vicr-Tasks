import type { Task } from "./types";
import { isoToLocalDay } from "./dates";

/**
 * Задачи, относящиеся к дню:
 * – дедлайн в этот день,
 * – созданные в этот день (без дедлайна или с дедлайном в этот день),
 * – выполненные в этот день,
 * – для «сегодня» дополнительно — просроченные невыполненные.
 */
export function dayProgress(tasks: Task[], day: string, today: string) {
  let total = 0;
  let done = 0;
  for (const t of tasks) {
    const created = isoToLocalDay(t.createdAt);
    const completed = isoToLocalDay(t.completedAt);
    const relevant =
      t.deadline === day ||
      completed === day ||
      (created === day && (!t.deadline || t.deadline <= day)) ||
      (day === today && !t.done && t.deadline !== null && t.deadline < today);
    if (!relevant) continue;
    // Задача, выполненная позже этого дня, на тот день считается невыполненной
    const doneThatDay = t.done && completed !== null && completed <= day;
    total++;
    if (doneThatDay) done++;
  }
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
