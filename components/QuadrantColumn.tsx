"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Quadrant, Task } from "@/lib/types";
import { QUADRANT_META } from "@/lib/types";
import TaskCard, { type CardActions } from "./TaskCard";

type Props = { quadrant: Quadrant; tasks: Task[]; today: string; actions: CardActions };

export default function QuadrantColumn({ quadrant, tasks, today, actions }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });
  const meta = QUADRANT_META[quadrant];
  const open = tasks.filter((t) => !t.done).length;

  return (
    <section
      ref={setNodeRef}
      className={`glass quadrant ${isOver ? "over" : ""}`}
      style={{ ["--accent" as string]: meta.accent }}
      aria-label={meta.title}
    >
      <div className="q-head">
        <div>
          <h3>{meta.title}</h3>
          <small>{meta.subtitle}</small>
        </div>
        <span className="q-count" title="Невыполненных">
          {open}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="q-empty">Перетащите задачу сюда</div>
      ) : (
        <div className="q-list">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} today={today} actions={actions} />
          ))}
        </div>
      )}
    </section>
  );
}
