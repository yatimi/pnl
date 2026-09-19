// Created by Tommy.
import { getUser } from "../../auth";
import { listEntries, saveEntry, deleteEntry } from "../../../db/journal";
import {
  entryIdPattern,
  monthPattern,
  validateEntry,
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
  const user = await getUser();
  if (!user) return json({ error: "authRequired" }, 401);
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!monthPattern.test(month))
    return json({ error: "invalidRequestMonth" }, 400);
  try {
    return json({ entries: await listEntries(user.userId, month, new URL(request.url).searchParams.get("all") === "true") });
  } catch (error) {
    console.error("Journal load failed", error);
    return json({ error: "loadFailed" }, 503);
  }
}
export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) return json({ error: "authRequired" }, 401);
  if (!sameOrigin(request)) return json({ error: "invalidOrigin" }, 403);
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return json({ error: "entryTooLarge" }, 413);
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 8192) return json({ error: "entryTooLarge" }, 413);
    input = JSON.parse(body);
  } catch {
    return json({ error: "invalidEntry" }, 400);
  }
  const entry = validateEntry(input);
  if (!entry) return json({ error: "checkEntry" }, 400);
  try {
    await saveEntry(user.userId, entry);
    return json({ entry });
  } catch (error) {
    console.error("Journal save failed", error);
    return json(
      {
        error: "saveRetry",
      },
      503,
    );
  }
}
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return json({ error: "authRequired" }, 401);
  if (!sameOrigin(request)) return json({ error: "invalidOrigin" }, 403);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!entryIdPattern.test(id)) return json({ error: "invalidEntry" }, 400);
  try {
    await deleteEntry(user.userId, id);
    return json({ deleted: true });
  } catch (error) {
    console.error("Journal delete failed", error);
    return json({ error: "deleteRetry" }, 503);
  }
}
