"use client";

import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { localDay } from "@/lib/dates";
import { QUADRANTS, type Quadrant, type Task } from "@/lib/types";
import BrainDump from "./BrainDump";
import ProgressHeader from "./ProgressHeader";
import QuadrantColumn from "./QuadrantColumn";
import TaskCard, { type CardActions } from "./TaskCard";

/** Невыполненные сверху, затем по дедлайну, затем новые */
function sortTasks(a: Task, b: Task) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.deadline !== b.deadline) {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline < b.deadline ? -1 : 1;
  }
  return b.createdAt.localeCompare(a.createdAt);
}

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [today, setToday] = useState(() => localDay());

  const fail = useCallback((err: unknown) => {
    setToast(err instanceof Error ? err.message : "Что-то пошло не так");
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    api.list().then((r) => setTasks(r.tasks)).catch(fail).finally(() => setLoading(false));
    // Обновляем «сегодня» после полуночи
    const t = setInterval(() => setToday(localDay()), 60_000);
    return () => clearInterval(t);
  }, [fail]);

  /** Оптимистичное обновление с откатом */
  const optimistic = useCallback(
    async (mutate: (prev: Task[]) => Task[], request: () => Promise<unknown>) => {
      let snapshot: Task[] = [];
      setTasks((prev) => {
        snapshot = prev;
        return mutate(prev);
      });
      try {
        await request();
      } catch (err) {
        setTasks(snapshot);
        fail(err);
      }
    },
    [fail],
  );

  const patchTask = (id: string, patch: Partial<Task>) => (prev: Task[]) =>
    prev.map((t) => (t.id === id ? { ...t, ...patch } : t));

  const actions: CardActions = useMemo(
    () => ({
      onToggle: (id, done) =>
        optimistic(patchTask(id, { done, completedAt: done ? new Date().toISOString() : null }), () => api.update(id, { done })),
      onDelete: (id) => optimistic((prev) => prev.filter((t) => t.id !== id), () => api.remove(id)),
      onDeadline: (id, deadline) => optimistic(patchTask(id, { deadline }), () => api.update(id, { deadline })),
      onBreakdown: async (id) => {
        try {
          const { subtasks } = await api.breakdown(id);
          setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, subtasks: [...t.subtasks, ...subtasks] } : t)));
        } catch (err) {
          fail(err);
        }
      },
      onToggleSub: (taskId, subId, done) =>
        optimistic(
          (prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done } : s)) } : t,
            ),
          () => api.updateSub(subId, done),
        ),
      onDeleteSub: (taskId, subId) =>
        optimistic(
          (prev) => prev.map((t) => (t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) } : t)),
          () => api.removeSub(subId),
        ),
    }),
    [optimistic, fail],
  );

  const parse = useCallback(async (text: string) => {
    const { tasks: created } = await api.parse(text, localDay());
    setTasks((prev) => [...created, ...prev]);
    return created.length;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const target = e.over?.id as Quadrant | undefined;
    const task = tasks.find((t) => t.id === id);
    if (!task || !target || !QUADRANTS.includes(target) || task.quadrant === target) return;
    optimistic(patchTask(id, { quadrant: target }), () => api.update(id, { quadrant: target }));
  }

  const byQuadrant = useMemo(() => {
    const map = Object.fromEntries(QUADRANTS.map((q) => [q, [] as Task[]])) as Record<Quadrant, Task[]>;
    for (const t of tasks) map[t.quadrant]?.push(t);
    for (const q of QUADRANTS) map[q].sort(sortTasks);
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <main className="container">
      <ProgressHeader tasks={tasks} today={today} />
      <BrainDump onParse={parse} />

      {loading ? (
        <div className="glass loading-grid">Загружаем задачи…</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="matrix">
            {QUADRANTS.map((q) => (
              <QuadrantColumn key={q} quadrant={q} tasks={byQuadrant[q]} today={today} actions={actions} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
            {activeTask ? <TaskCard task={activeTask} today={today} actions={actions} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {toast && (
        <div className="glass toast" role="alert">
          {toast}
        </div>
      )}
    </main>
  );
}
