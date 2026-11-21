import type { Quadrant, Subtask, Task } from "./types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Ошибка ${res.status}`);
  return data as T;
}

export const api = {
  list: () => req<{ tasks: Task[] }>("/api/tasks"),
  parse: (text: string, today: string) =>
    req<{ tasks: Task[] }>("/api/parse", { method: "POST", body: JSON.stringify({ text, today }) }),
  update: (id: string, patch: Partial<{ done: boolean; quadrant: Quadrant; deadline: string | null; title: string }>) =>
    req<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => req<{ ok: true }>(`/api/tasks/${id}`, { method: "DELETE" }),
  breakdown: (id: string) => req<{ subtasks: Subtask[] }>(`/api/tasks/${id}/subtasks`, { method: "POST" }),
  updateSub: (id: string, done: boolean) =>
    req<{ subtask: Subtask }>(`/api/subtasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
  removeSub: (id: string) => req<{ ok: true }>(`/api/subtasks/${id}`, { method: "DELETE" }),
};
