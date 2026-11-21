import "server-only";
import { createClient, type Client, type Row } from "@libsql/client";
import { SCHEMA } from "./schema";
import type { Quadrant, Subtask, Task } from "./types";

let client: Client | null = null;
let ready: Promise<void> | null = null;

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || "file:local.db";
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  }
  return client;
}

/** Клиент с гарантированно созданной схемой */
export async function db(): Promise<Client> {
  const c = getClient();
  if (!ready) {
    ready = c.executeMultiple(SCHEMA).catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
  return c;
}

const rowToSubtask = (r: Row): Subtask => ({
  id: String(r.id),
  taskId: String(r.task_id),
  title: String(r.title),
  done: Number(r.done) === 1,
  position: Number(r.position),
});

const rowToTask = (r: Row, subtasks: Subtask[]): Task => ({
  id: String(r.id),
  title: String(r.title),
  category: String(r.category ?? ""),
  quadrant: String(r.quadrant) as Quadrant,
  deadline: r.deadline ? String(r.deadline) : null,
  reason: String(r.reason ?? ""),
  done: Number(r.done) === 1,
  completedAt: r.completed_at ? String(r.completed_at) : null,
  createdAt: String(r.created_at),
  position: Number(r.position),
  subtasks,
});

export async function listTasks(ids?: string[]): Promise<Task[]> {
  const c = await db();
  const where = ids?.length ? `WHERE id IN (${ids.map(() => "?").join(",")})` : "";
  const subWhere = ids?.length ? `WHERE task_id IN (${ids.map(() => "?").join(",")})` : "";
  const [t, s] = await c.batch(
    [
      { sql: `SELECT * FROM tasks ${where} ORDER BY created_at DESC`, args: ids ?? [] },
      { sql: `SELECT * FROM subtasks ${subWhere} ORDER BY position, rowid`, args: ids ?? [] },
    ],
    "read",
  );
  const subs = new Map<string, Subtask[]>();
  for (const r of s.rows) {
    const st = rowToSubtask(r);
    if (!subs.has(st.taskId)) subs.set(st.taskId, []);
    subs.get(st.taskId)!.push(st);
  }
  return t.rows.map((r) => rowToTask(r, subs.get(String(r.id)) ?? []));
}

export async function getTask(id: string): Promise<Task | null> {
  return (await listTasks([id]))[0] ?? null;
}

export type NewTask = { title: string; category: string; quadrant: Quadrant; deadline: string | null; reason: string };

export async function insertTasks(items: NewTask[]): Promise<Task[]> {
  if (!items.length) return [];
  const c = await db();
  const now = new Date().toISOString();
  const ids = items.map(() => crypto.randomUUID());
  await c.batch(
    items.map((t, i) => ({
      sql: `INSERT INTO tasks (id, title, category, quadrant, deadline, reason, created_at, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [ids[i], t.title, t.category, t.quadrant, t.deadline, t.reason, now, i],
    })),
    "write",
  );
  return listTasks(ids);
}

export async function updateTask(
  id: string,
  patch: Partial<{ done: boolean; quadrant: Quadrant; deadline: string | null; title: string }>,
): Promise<Task | null> {
  const c = await db();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (patch.title !== undefined) { sets.push("title = ?"); args.push(patch.title); }
  if (patch.quadrant !== undefined) { sets.push("quadrant = ?"); args.push(patch.quadrant); }
  if (patch.deadline !== undefined) { sets.push("deadline = ?"); args.push(patch.deadline); }
  if (patch.done !== undefined) {
    sets.push("done = ?", "completed_at = ?");
    args.push(patch.done ? 1 : 0, patch.done ? new Date().toISOString() : null);
  }
  if (sets.length) {
    const r = await c.execute({ sql: `UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, args: [...args, id] });
    if (r.rowsAffected === 0) return null;
  }
  return getTask(id);
}

export async function deleteTask(id: string): Promise<boolean> {
  const c = await db();
  const [, r] = await c.batch(
    [
      { sql: "DELETE FROM subtasks WHERE task_id = ?", args: [id] },
      { sql: "DELETE FROM tasks WHERE id = ?", args: [id] },
    ],
    "write",
  );
  return r.rowsAffected > 0;
}

export async function insertSubtasks(taskId: string, titles: string[]): Promise<Subtask[]> {
  const c = await db();
  const max = await c.execute({ sql: "SELECT COALESCE(MAX(position), -1) AS p FROM subtasks WHERE task_id = ?", args: [taskId] });
  const start = Number(max.rows[0]?.p ?? -1) + 1;
  const subs: Subtask[] = titles.map((title, i) => ({
    id: crypto.randomUUID(), taskId, title, done: false, position: start + i,
  }));
  await c.batch(
    subs.map((s) => ({
      sql: "INSERT INTO subtasks (id, task_id, title, position) VALUES (?, ?, ?, ?)",
      args: [s.id, s.taskId, s.title, s.position],
    })),
    "write",
  );
  return subs;
}

export async function updateSubtask(id: string, done: boolean): Promise<Subtask | null> {
  const c = await db();
  const r = await c.execute({ sql: "UPDATE subtasks SET done = ? WHERE id = ? RETURNING *", args: [done ? 1 : 0, id] });
  return r.rows[0] ? rowToSubtask(r.rows[0]) : null;
}

export async function deleteSubtask(id: string): Promise<boolean> {
  const c = await db();
  const r = await c.execute({ sql: "DELETE FROM subtasks WHERE id = ?", args: [id] });
  return r.rowsAffected > 0;
}
