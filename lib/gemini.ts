import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { QUADRANTS } from "./types";

/** Кандидаты по убыванию предпочтения; первая доступная модель кэшируется */
// flash-lite — последний запасной вариант, когда полные flash-модели перегружены
const FALLBACK_MODEL = "gemini-3.5-flash-lite";
const MODEL_CANDIDATES = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", FALLBACK_MODEL];
let resolvedModel: string | null = null;
/** Таймаут на одну модель: зависшая модель уступает следующей */
const PER_MODEL_TIMEOUT_MS = 15_000;
/**
 * Общий бюджет времени на запрос к ИИ. На Netlify функции обрываются через 10 с,
 * поэтому там задаётся GEMINI_BUDGET_MS=8500. Часть бюджета резервируется под быструю flash-lite.
 */
const BUDGET_MS = Number(process.env.GEMINI_BUDGET_MS) || 40_000;
const FALLBACK_RESERVE_MS = 3_000;
const MIN_ATTEMPT_MS = 1_500;

let ai: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpError(500, "GEMINI_API_KEY не задан на сервере");
  ai ??= new GoogleGenAI({ apiKey });
  return ai;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Ошибка «модель недоступна» → пробуем следующую */
function isModelUnavailable(e: unknown) {
  return e instanceof ApiError && (e.status === 404 || (e.status === 400 && /model/i.test(e.message)));
}

function isTimeout(e: unknown) {
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
}

/** Модель временно перегружена → тоже пробуем следующую */
function isOverloaded(e: unknown) {
  return e instanceof ApiError && (e.status === 503 || e.status === 500 || e.status === 429);
}

/** Запрос с Structured Output (строгий JSON по схеме) + валидация zod */
async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  jsonSchema: object;
  zodSchema: z.ZodType<T>;
}): Promise<T> {
  // Если GEMINI_MODEL задан явно — используем только его.
  // Иначе: последняя рабочая модель первой, затем остальные кандидаты.
  const models = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL]
    : [...new Set([...(resolvedModel ? [resolvedModel] : []), ...MODEL_CANDIDATES])];
  let lastErr: unknown;
  const deadline = Date.now() + BUDGET_MS;

  for (const model of models) {
    const remaining = deadline - Date.now();
    // Обычной модели оставляем запас под flash-lite; flash-lite получает всё оставшееся время
    const timeout =
      model === FALLBACK_MODEL || process.env.GEMINI_MODEL
        ? remaining
        : Math.min(PER_MODEL_TIMEOUT_MS, remaining - FALLBACK_RESERVE_MS);
    if (timeout < MIN_ATTEMPT_MS) continue;
    try {
      const res = await client().models.generateContent({
        model,
        contents: opts.prompt,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: opts.jsonSchema,
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(timeout),
        },
      });
      if (resolvedModel !== model) console.info(`[gemini] используется модель ${model}`);
      resolvedModel = model;
      const raw = res.text;
      if (!raw) throw new HttpError(502, "Пустой ответ от Gemini");
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        throw new HttpError(502, "Gemini вернул некорректный JSON");
      }
      const parsed = opts.zodSchema.safeParse(json);
      if (!parsed.success) throw new HttpError(502, "Ответ Gemini не соответствует схеме");
      return parsed.data;
    } catch (e) {
      lastErr = e;
      if (isModelUnavailable(e) || isOverloaded(e) || isTimeout(e)) continue;
      break;
    }
  }

  if (lastErr === undefined) throw new HttpError(504, "Gemini не ответил вовремя, попробуйте ещё раз");
  if (lastErr instanceof HttpError) throw lastErr;
  if (lastErr instanceof ApiError) {
    if (lastErr.status === 429) throw new HttpError(429, "Лимит запросов Gemini исчерпан, попробуйте позже");
    if (lastErr.status === 503 || lastErr.status === 500)
      throw new HttpError(503, "Модели Gemini сейчас перегружены, попробуйте через минуту");
    if (lastErr.status === 401 || lastErr.status === 403) throw new HttpError(500, "Неверный GEMINI_API_KEY");
    if (isModelUnavailable(lastErr)) throw new HttpError(500, `Нет доступной модели: ${models.join(", ")}`);
    throw new HttpError(502, `Gemini: ${lastErr.message.slice(0, 200)}`);
  }
  if (isTimeout(lastErr)) throw new HttpError(504, "Gemini не ответил вовремя, попробуйте ещё раз");
  throw new HttpError(502, "Не удалось связаться с Gemini");
}

/* ------------------------------------------------------------------ */
/* Разбор brain dump                                                    */
/* ------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ParsedTasks = z
  .object({
    tasks: z.array(
      z
        .object({
          title: z.string().min(1),
          category: z.string(),
          urgent: z.boolean(),
          important: z.boolean(),
          deadline: z.string().regex(DATE_RE).nullable(),
          reason: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

const PARSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Короткая формулировка задачи в повелительном наклонении" },
          category: { type: "string", description: "Категория одним-двумя словами: Работа, Дом, Здоровье, Финансы, Учёба, Покупки, Личное…" },
          urgent: { type: "boolean", description: "Срочно: дедлайн в ближайшие 2 дня или явная срочность" },
          important: { type: "boolean", description: "Важно: влияет на цели, здоровье, деньги, обязательства" },
          deadline: { type: ["string", "null"], description: "Дата YYYY-MM-DD или null, если срок не указан" },
          reason: { type: "string", description: "Причина приоритета, не более 7 слов" },
        },
        required: ["title", "category", "urgent", "important", "deadline", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["tasks"],
  additionalProperties: false,
};

function quadrantOf(urgent: boolean, important: boolean): (typeof QUADRANTS)[number] {
  if (urgent && important) return "do";
  if (!urgent && important) return "plan";
  if (urgent && !important) return "delegate";
  return "eliminate";
}

function clampWords(s: string, n: number) {
  return s.trim().split(/\s+/).slice(0, n).join(" ").replace(/[.,;:]+$/, "");
}

export async function extractTasks(text: string, today: string) {
  const weekday = new Date(`${today}T12:00:00`).toLocaleDateString("ru-RU", { weekday: "long" });
  const result = await generateJson({
    system: [
      "Ты — ассистент по продуктивности. Извлеки из текста пользователя все отдельные задачи.",
      `Сегодня ${today} (${weekday}). Относительные даты («завтра», «в пятницу», «через неделю», «до конца месяца») переводи в YYYY-MM-DD.`,
      "Если срок не упомянут — deadline = null.",
      "Определи urgent и important по матрице Эйзенхауэра.",
      "reason — причина приоритета на русском, максимум 7 слов, без точки.",
      "Не выдумывай задачи, не дублируй. Пиши на русском языке.",
    ].join("\n"),
    prompt: text,
    jsonSchema: PARSE_JSON_SCHEMA,
    zodSchema: ParsedTasks,
  });

  return result.tasks.map((t) => ({
    title: t.title.trim().slice(0, 300),
    category: t.category.trim().slice(0, 40),
    quadrant: quadrantOf(t.urgent, t.important),
    deadline: t.deadline,
    reason: clampWords(t.reason, 7),
  }));
}

/* ------------------------------------------------------------------ */
/* Разбиение на подзадачи                                               */
/* ------------------------------------------------------------------ */

const ParsedSubtasks = z.object({ subtasks: z.array(z.string().min(1)) }).strict();

const SUBTASKS_JSON_SCHEMA = {
  type: "object",
  properties: {
    subtasks: {
      type: "array",
      items: { type: "string", description: "Конкретный шаг, начинается с глагола" },
      minItems: 2,
      maxItems: 7,
    },
  },
  required: ["subtasks"],
  additionalProperties: false,
};

export async function breakdownTask(task: { title: string; category: string; deadline: string | null }, existing: string[]) {
  const result = await generateJson({
    system: [
      "Разбей задачу на 3–6 конкретных последовательных подзадач на русском языке.",
      "Каждая подзадача — короткое действие (до 8 слов), начинается с глагола.",
      existing.length ? "Не повторяй уже существующие подзадачи." : "",
    ].join("\n"),
    prompt: JSON.stringify({ задача: task.title, категория: task.category, дедлайн: task.deadline, уже_есть: existing }),
    jsonSchema: SUBTASKS_JSON_SCHEMA,
    zodSchema: ParsedSubtasks,
  });
  return result.subtasks.map((s) => s.trim().slice(0, 200)).filter(Boolean).slice(0, 7);
}
