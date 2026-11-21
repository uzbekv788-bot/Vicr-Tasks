/** Локальная дата в формате YYYY-MM-DD */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

export function isoToLocalDay(iso: string | null): string | null {
  return iso ? localDay(new Date(iso)) : null;
}

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
export function weekdayShort(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

export function formatDeadline(deadline: string, today: string): { text: string; tone: "late" | "soon" | "" } {
  if (deadline < today) return { text: `просрочено · ${human(deadline)}`, tone: "late" };
  if (deadline === today) return { text: "сегодня", tone: "soon" };
  if (deadline === addDays(today, 1)) return { text: "завтра", tone: "soon" };
  return { text: human(deadline), tone: "" };
}

function human(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
