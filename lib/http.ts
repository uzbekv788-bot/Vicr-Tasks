import "server-only";
import { NextResponse } from "next/server";
import { HttpError } from "./gemini";

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Некорректный JSON");
  }
}
