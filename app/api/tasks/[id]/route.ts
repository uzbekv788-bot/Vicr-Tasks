import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTask, updateTask } from "@/lib/db";
import { HttpError } from "@/lib/gemini";
import { errorResponse, readJson } from "@/lib/http";
import { QUADRANTS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z
  .object({
    done: z.boolean(),
    quadrant: z.enum(QUADRANTS),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    title: z.string().trim().min(1).max(300),
  })
  .partial()
  .strict();

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const patch = Patch.safeParse(await readJson(req));
    if (!patch.success) throw new HttpError(400, "Некорректные поля");
    const task = await updateTask(id, patch.data);
    if (!task) throw new HttpError(404, "Задача не найдена");
    return NextResponse.json({ task });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!(await deleteTask(id))) throw new HttpError(404, "Задача не найдена");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
