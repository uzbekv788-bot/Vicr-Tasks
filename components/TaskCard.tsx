"use client";

import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import type { Task } from "@/lib/types";
import { QUADRANT_META } from "@/lib/types";
import { formatDeadline } from "@/lib/dates";
import { CloseIcon, GripIcon, SparkIcon, TrashIcon } from "./Icons";

export type CardActions = {
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onDeadline: (id: string, deadline: string | null) => void;
  onBreakdown: (id: string) => Promise<void>;
  onToggleSub: (taskId: string, subId: string, done: boolean) => void;
  onDeleteSub: (taskId: string, subId: string) => void;
};

type Props = { task: Task; today: string; actions: CardActions; overlay?: boolean };

export default function TaskCard({ task, today, actions, overlay }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled: overlay });
  const [splitting, setSplitting] = useState(false);
  const [editingDate, setEditingDate] = useState(false);

  const accent = QUADRANT_META[task.quadrant].accent;
  const dl = task.deadline ? formatDeadline(task.deadline, today) : null;
  const subDone = task.subtasks.filter((s) => s.done).length;

  async function split() {
    setSplitting(true);
    try {
      await actions.onBreakdown(task.id);
    } finally {
      setSplitting(false);
    }
  }

  return (
    <article
      ref={overlay ? undefined : setNodeRef}
      className={`card ${task.done ? "done" : ""} ${overlay ? "dragging" : ""}`}
      style={{ ["--accent" as string]: accent, opacity: isDragging ? 0.3 : undefined }}
    >
      <div className="card-row">
        <button className="grip" aria-label="Перетащить" {...listeners} {...attributes}>
          <GripIcon />
        </button>
        <input
          type="checkbox"
          className="check"
          checked={task.done}
          onChange={(e) => actions.onToggle(task.id, e.target.checked)}
          aria-label="Отметить выполненной"
        />
        <div className="title">{task.title}</div>
        <button className="icon-btn danger" onClick={() => actions.onDelete(task.id)} aria-label="Удалить задачу" title="Удалить">
          <TrashIcon />
        </button>
      </div>

      <div className="meta">
        {task.category && <span className="chip cat">{task.category}</span>}
        {editingDate ? (
          <input
            type="date"
            className="date-input"
            autoFocus
            defaultValue={task.deadline ?? ""}
            onBlur={(e) => {
              setEditingDate(false);
              const v = e.target.value || null;
              if (v !== task.deadline) actions.onDeadline(task.id, v);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <button
            className={`chip ${dl?.tone ?? ""}`}
            style={{ cursor: "pointer", font: "inherit", fontSize: 11.5 }}
            onClick={() => setEditingDate(true)}
            title="Изменить дедлайн"
          >
            ⏱ {dl ? dl.text : "без дедлайна"}
          </button>
        )}
      </div>

      {task.reason && (
        <div className="reason">
          <b>ИИ</b>
          <span>{task.reason}</span>
        </div>
      )}

      {task.subtasks.length > 0 && (
        <ul className="subtasks">
          {task.subtasks.map((s) => (
            <li key={s.id} className={s.done ? "done" : ""}>
              <input
                type="checkbox"
                className="check sm"
                checked={s.done}
                onChange={(e) => actions.onToggleSub(task.id, s.id, e.target.checked)}
                aria-label={`Подзадача: ${s.title}`}
              />
              <span>{s.title}</span>
              <button className="icon-btn danger" onClick={() => actions.onDeleteSub(task.id, s.id)} aria-label="Удалить подзадачу">
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="card-foot">
        <button className="link-btn" onClick={split} disabled={splitting}>
          {splitting ? <span className="spinner" /> : <SparkIcon size={13} />}
          {task.subtasks.length ? "Разбить ещё" : "Разбить на подзадачи"}
        </button>
        {task.subtasks.length > 0 && (
          <span className="sub-progress">
            {subDone}/{task.subtasks.length}
          </span>
        )}
      </div>
    </article>
  );
}
