// Created by Tommy.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response("Invalid origin", { status: 403 });
  }
  const client = await createClient();
  const { error } = await client.auth.signOut();
  if (error) return Response.json({ error: "signOutFailed" }, { status: 503 });
  return NextResponse.redirect(new URL("/sign-in", request.url), 303);
}
