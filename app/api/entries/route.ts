// Created by Tommy.
import { getChatGPTUser } from "../../chatgpt-auth";
import { listEntries, saveEntry, deleteEntry } from "../../../db/journal";
import {
  categories,
  monthPattern,
  validDate,
  validateEntry,
  type Category,
} from "../../../lib/journal";
export const dynamic = "force-dynamic";
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Войди, чтобы открыть дневник." }, 401);
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!monthPattern.test(month))
    return json({ error: "Некорректный месяц." }, 400);
  try {
    return json({ entries: await listEntries(user.userId, month) });
  } catch (error) {
    console.error("Journal load failed", error);
    return json(
      { error: "Не удалось загрузить дневник. Попробуй ещё раз." },
      503,
    );
  }
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Войди, чтобы сохранить запись." }, 401);
  if (!sameOrigin(request))
    return json({ error: "Недопустимый источник запроса." }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return json({ error: "Слишком большая запись." }, 413);
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 8192)
      return json({ error: "Слишком большая запись." }, 413);
    input = JSON.parse(body);
  } catch {
    return json({ error: "Некорректная запись." }, 400);
  }
  const entry = validateEntry(input);
  if (!entry)
    return json(
      { error: "Проверь дату, сумму и заметку (до 500 символов)." },
      400,
    );
  try {
    await saveEntry(user.userId, entry);
    return json({ entry });
  } catch (error) {
    console.error("Journal save failed", error);
    return json(
      {
        error:
          "Не удалось сохранить. Текст остался в форме — попробуй ещё раз.",
      },
      503,
    );
  }
}
export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: "Войди, чтобы изменить дневник." }, 401);
  if (!sameOrigin(request))
    return json({ error: "Недопустимый источник запроса." }, 403);
  const url = new URL(request.url),
    date = url.searchParams.get("date") ?? "",
    category = url.searchParams.get("category") ?? "";
  if (!validDate(date) || !Object.hasOwn(categories, category))
    return json({ error: "Некорректная запись." }, 400);
  try {
    await deleteEntry(user.userId, date, category as Category);
    return json({ deleted: true });
  } catch (error) {
    console.error("Journal delete failed", error);
    return json({ error: "Не удалось удалить запись. Попробуй ещё раз." }, 503);
  }
}
