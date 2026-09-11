// Created by Tommy.
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
export async function getUser() {
  if (!authConfigured()) return null;
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return { userId: user.id, email: user.email };
}
