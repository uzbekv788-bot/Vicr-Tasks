import { NextResponse } from "next/server";
import { getTask, insertSubtasks } from "@/lib/db";
import { breakdownTask, HttpError } from "@/lib/gemini";
import { errorResponse } from "@/lib/http";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const task = await getTask(id);
    if (!task) throw new HttpError(404, "Задача не найдена");
    const titles = await breakdownTask(task, task.subtasks.map((s) => s.title));
    const subtasks = await insertSubtasks(id, titles);
    return NextResponse.json({ subtasks });
  } catch (e) {
    return errorResponse(e);
  }
}
