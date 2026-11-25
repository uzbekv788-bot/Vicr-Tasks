# Vice Tasks — AI менеджер задач

Next.js 16 · Turso (libSQL) · Gemini Structured Output · glassmorphism в стиле Vice City.
План реализации — в [PLAN.md](./PLAN.md).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fuzbekv788-bot%2Fvicr-tasks&project-name=vice-tasks&env=TURSO_DATABASE_URL,TURSO_AUTH_TOKEN,GEMINI_API_KEY&envDescription=Turso%20URL%20%D0%B8%20%D1%82%D0%BE%D0%BA%D0%B5%D0%BD%2C%20%D0%BA%D0%BB%D1%8E%D1%87%20Gemini&envLink=https%3A%2F%2Fgithub.com%2Fuzbekv788-bot%2Fvicr-tasks%23%D0%B4%D0%B5%D0%BF%D0%BB%D0%BE%D0%B9-%D0%BD%D0%B0-vercel)

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

## Деплой на Vercel

1. Нажмите кнопку **Deploy with Vercel** выше (или импортируйте репозиторий на vercel.com/new).
2. Укажите переменные окружения:
   - `TURSO_DATABASE_URL` — `turso db show <db> --url`
   - `TURSO_AUTH_TOKEN` — `turso db tokens create <db>`
   - `GEMINI_API_KEY` — aistudio.google.com/apikey
   - (необязательно) `GEMINI_MODEL`
3. Deploy. Схема БД создастся автоматически при первом запросе.

Маршруты ИИ используют `maxDuration = 60` — на бесплатном тарифе Vercel этого достаточно.
