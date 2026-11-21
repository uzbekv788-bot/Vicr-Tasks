import { NextResponse } from "next/server";
import { z } from "zod";
import { insertTasks } from "@/lib/db";
import { extractTasks, HttpError } from "@/lib/gemini";
import { errorResponse, readJson } from "@/lib/http";

export const maxDuration = 60;

const Body = z.object({
  text: z.string().trim().min(1, "Пустой текст").max(8000, "Слишком длинный текст"),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Body.safeParse(await readJson(req));
    if (!body.success) throw new HttpError(400, body.error.issues[0]?.message ?? "Некорректный запрос");
    const today = body.data.today ?? new Date().toISOString().slice(0, 10);
    const items = await extractTasks(body.data.text, today);
    const tasks = await insertTasks(items);
    return NextResponse.json({ tasks });
  } catch (e) {
    return errorResponse(e);
  }
}
