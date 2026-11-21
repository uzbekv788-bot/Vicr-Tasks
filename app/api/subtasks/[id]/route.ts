import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteSubtask, updateSubtask } from "@/lib/db";
import { HttpError } from "@/lib/gemini";
import { errorResponse, readJson } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({ done: z.boolean() }).strict();

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = Patch.safeParse(await readJson(req));
    if (!body.success) throw new HttpError(400, "Некорректные поля");
    const subtask = await updateSubtask(id, body.data.done);
    if (!subtask) throw new HttpError(404, "Подзадача не найдена");
    return NextResponse.json({ subtask });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!(await deleteSubtask(id))) throw new HttpError(404, "Подзадача не найдена");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
