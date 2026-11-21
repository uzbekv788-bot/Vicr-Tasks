export const QUADRANTS = ["do", "plan", "delegate", "eliminate"] as const;
export type Quadrant = (typeof QUADRANTS)[number];

export const QUADRANT_META: Record<
  Quadrant,
  { title: string; subtitle: string; accent: string }
> = {
  do: { title: "Срочно и важно", subtitle: "Сделать сейчас", accent: "var(--pink)" },
  plan: { title: "Не срочно и важно", subtitle: "Запланировать", accent: "var(--teal)" },
  delegate: { title: "Срочно и не важно", subtitle: "Делегировать", accent: "var(--sunset)" },
  eliminate: { title: "Не срочно и не важно", subtitle: "Отложить / убрать", accent: "var(--violet)" },
};

export type Subtask = {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  position: number;
};

export type Task = {
  id: string;
  title: string;
  category: string;
  quadrant: Quadrant;
  deadline: string | null; // YYYY-MM-DD
  reason: string;
  done: boolean;
  completedAt: string | null; // ISO
  createdAt: string; // ISO
  position: number;
  subtasks: Subtask[];
};
