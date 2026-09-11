// Created by Tommy.
import { redirect } from "next/navigation";
import { getUser } from "../auth";
import AuthForm from "../auth-form";
export const dynamic = "force-dynamic";
export default async function ResetPassword() {
  if (!await getUser()) redirect("/sign-in?error=authLinkExpired");
  return <AuthForm configured reset />;
}
