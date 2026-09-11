// Created by Tommy.
import AuthForm from "../auth-form";
import { authConfigured } from "@/lib/supabase/config";
export const dynamic = "force-dynamic";
export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthForm configured={authConfigured()} linkError={error === "authLinkExpired"} />;
}
