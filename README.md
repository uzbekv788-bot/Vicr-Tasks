# Vice Tasks — AI менеджер задач

Next.js 16 · Turso (libSQL) · Gemini Structured Output · glassmorphism в стиле Vice City.
План реализации — в [PLAN.md](./PLAN.md).

## Запуск

```bash
npm install
cp .env.example .env.local   # заполнить ключи
npm run dev
```

Без `TURSO_DATABASE_URL` используется локальный файл `local.db`. Схема создаётся автоматически
при первом запросе (или вручную: `npm run db:init`).

### Turso
```bash
turso db create ai-tasks
turso db show ai-tasks --url        # → TURSO_DATABASE_URL
turso db tokens create ai-tasks     # → TURSO_AUTH_TOKEN
```

### Gemini
`GEMINI_API_KEY` читается только в серверных route handlers (`lib/gemini.ts` помечен `server-only`),
в браузер не попадает. Модель: `GEMINI_MODEL`, иначе перебор
`gemini-3.8-flash → 3.7-flash → 3.6-flash → 3.5-flash → 3.5-flash-lite`.
Модель пропускается, если её нет, она перегружена (503/500/429) или не ответила за 15 с;
последняя сработавшая модель пробуется первой в следующих запросах.

## Структура
```
app/api/parse                 POST  текст → Gemini → задачи в БД
app/api/tasks                 GET   все задачи с подзадачами
app/api/tasks/[id]            PATCH done / quadrant / deadline / title · DELETE
app/api/tasks/[id]/subtasks   POST  Gemini разбивает задачу на подзадачи
app/api/subtasks/[id]         PATCH done · DELETE
components/                   TaskBoard, BrainDump (Web Speech API, ru-RU), QuadrantColumn, TaskCard, ProgressHeader
lib/                          db.ts, gemini.ts, schema.ts, progress.ts, dates.ts
```

Голосовой ввод работает в Chrome/Edge/Safari (Web Speech API); в Firefox кнопка микрофона неактивна.
