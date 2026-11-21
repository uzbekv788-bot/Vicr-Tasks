"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/types";
import { addDays, weekdayShort } from "@/lib/dates";
import { dayProgress } from "@/lib/progress";

export default function ProgressHeader({ tasks, today }: { tasks: Task[]; today: string }) {
  const todayStats = useMemo(() => dayProgress(tasks, today, today), [tasks, today]);
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(today, i - 6);
        return { day, ...dayProgress(tasks, day, today) };
      }),
    [tasks, today],
  );

  const r = 32;
  const c = 2 * Math.PI * r;

  return (
    <header className="glass header">
      <div className="brand">
        <h1>VICE TASKS</h1>
        <p>Выгрузи мысли — ИИ разложит их по матрице Эйзенхауэра</p>
      </div>

      <div className="progress">
        <div className="ring" role="img" aria-label={`Прогресс сегодня ${todayStats.pct}%`}>
          <svg width="76" height="76">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff2d95" />
                <stop offset="100%" stopColor="#ff8a3d" />
              </linearGradient>
            </defs>
            <circle cx="38" cy="38" r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="7" fill="none" />
            <circle
              cx="38" cy="38" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - todayStats.pct / 100)}
              style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)", filter: "drop-shadow(0 0 6px rgba(255,45,149,.6))" }}
            />
          </svg>
          <div className="value">{todayStats.pct}%</div>
        </div>
        <div className="progress-meta">
          <span className="label">
            Сегодня: {todayStats.done} из {todayStats.total}
          </span>
          <div className="week">
            {week.map((d) => (
              <div key={d.day} className={`day ${d.day === today ? "today" : ""}`} title={`${d.day}: ${d.pct}% (${d.done}/${d.total})`}>
                <div className="bar"><i style={{ height: `${d.pct}%` }} /></div>
                {weekdayShort(d.day)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
