# AI Tasks Manager — план реализации

Стек: **Next.js 16 (App Router) + TypeScript**, **Turso (libSQL)**, **Gemini API** (Structured Output, строгий JSON),
`@dnd-kit/core` для drag & drop, Web Speech API для голосового ввода. Без авторизации.

---

## Часть 1. Фронтенд

### 1.1 Каркас и дизайн-система
- `app/layout.tsx` — шрифты с кириллицей (Unbounded для заголовков, Manrope для текста) через `next/font`.
- `app/globals.css` — CSS-токены палитры Vice City / GTA6:
  - ночное небо `#0b0620 → #2a0b45`, закат `#ff8a3d`, неоновый розовый `#ff2d95`,
    бирюза океана `#22e1d6`, фиолет `#8b5cf6`.
  - фон: градиент «закат над океаном» + размытые световые пятна + неоновая линия горизонта.
  - glassmorphism: `backdrop-filter: blur(18px)`, полупрозрачная заливка, тонкая светлая рамка.
  - минимализм: мало элементов, крупные отступы, мягкие тени-свечения.
- Адаптив: на мобильных матрица 2×2 → 1 колонка.

### 1.2 Шапка + счётчик прогресса дня
- `ProgressRing` — кольцо с % выполненных задач на сегодня
  (задачи с дедлайном сегодня/просроченные, созданные сегодня или выполненные сегодня).
- Полоска последних 7 дней (% по каждому дню) — «счётчик на каждый день».

### 1.3 Brain Dump (умный ввод)
- `BrainDump` — textarea + кнопка микрофона + кнопка «Разобрать с помощью ИИ».
- Голос: `SpeechRecognition / webkitSpeechRecognition`, `lang = "ru-RU"`, `continuous`, `interimResults`;
  финальные фразы дописываются в поле, промежуточные показываются серым.
  Если API нет (Firefox) — кнопка неактивна с подсказкой.
- Состояния: загрузка, ошибка, количество созданных задач.

### 1.4 Матрица Эйзенхауэра
- `Matrix` — сетка 2×2: «Срочно и важно», «Не срочно и важно», «Срочно и не важно», «Не срочно и не важно».
- `Quadrant` — droppable-зона (`useDroppable`), подсветка при наведении.
- `TaskCard` — draggable (`useDraggable`, ручка-«грип»):
  - чекбокс выполнения, заголовок, категория-чип, дедлайн (с пометкой «просрочено/сегодня/завтра»);
  - ИИ-обоснование приоритета (≤7 слов);
  - кнопка «Разбить на подзадачи» (ИИ) → список подзадач с чекбоксами;
  - удаление.
- Оптимистичные обновления UI, откат при ошибке сервера.

## Часть 2. Бэкенд: БД и Gemini

### 2.1 Turso (libSQL)
- `lib/db.ts` — singleton `createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN })`,
  локальный фолбэк `file:local.db`; ленивое создание схемы (`CREATE TABLE IF NOT EXISTS`).
- Таблицы:
  - `tasks(id, title, category, quadrant, deadline, reason, done, completed_at, created_at, position)`
  - `subtasks(id, task_id → tasks ON DELETE CASCADE, title, done, position)`
- `scripts/init-db.mjs` — ручная инициализация схемы.

### 2.2 Gemini (ключ только на сервере)
- `lib/gemini.ts` — `@google/genai`, `GEMINI_API_KEY` читается только в route handlers (`import "server-only"`).
- Выбор модели: `GEMINI_MODEL` из env, иначе перебор
  `gemini-3.8-flash → gemini-3.6-flash → gemini-3.5-flash`; первая ответившая кэшируется.
- Structured Output: `responseMimeType: "application/json"` + `responseJsonSchema`,
  затем валидация ответа через `zod` (strict).
- Промпт разбора: текущая дата (для «завтра», «в пятницу»), правила квадрантов,
  `reason` ≤ 7 слов (дополнительно обрезается на сервере).

### 2.3 Route handlers (`app/api/...`)
| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/tasks` | все задачи с подзадачами |
| POST | `/api/parse` | текст → Gemini → задачи в БД |
| PATCH | `/api/tasks/[id]` | `done`, `quadrant` (перенос), `deadline`, `title` |
| DELETE | `/api/tasks/[id]` | удаление |
| POST | `/api/tasks/[id]/subtasks` | Gemini разбивает задачу на подзадачи |
| PATCH/DELETE | `/api/subtasks/[id]` | отметка / удаление подзадачи |

### 2.4 Деплой
- Vercel: env `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `GEMINI_API_KEY`, (опц.) `GEMINI_MODEL`.
- Turso: `turso db create ai-tasks`, `turso db show ai-tasks --url`, `turso db tokens create ai-tasks`.
