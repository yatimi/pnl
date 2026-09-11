// Created by Tommy.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Only two fixed destinations; user-controlled external redirects are rejected.
  const destination = url.searchParams.get("next") === "/reset-password" ? "/reset-password" : "/";
  if (code) {
    const client = await createClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=authLinkExpired", url.origin));
}
