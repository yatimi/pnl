// Created by Tommy.
import { createClient } from "@/lib/supabase/server";
// Uses the authenticated user's session, never an admin/service-role key.
export const getDatabase = createClient;
