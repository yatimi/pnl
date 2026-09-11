// Created by Tommy.
import { redirect } from "next/navigation";
import Dashboard from "./dashboard";
import { getUser } from "./auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!await getUser()) redirect("/sign-in");
  return <Dashboard />;
}
