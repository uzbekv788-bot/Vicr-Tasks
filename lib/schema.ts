export const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT '',
  quadrant     TEXT NOT NULL CHECK (quadrant IN ('do','plan','delegate','eliminate')),
  deadline     TEXT,
  reason       TEXT NOT NULL DEFAULT '',
  done         INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at   TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tasks_quadrant ON tasks(quadrant);
CREATE TABLE IF NOT EXISTS subtasks (
  id       TEXT PRIMARY KEY,
  task_id  TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title    TEXT NOT NULL,
  done     INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
`;
