// Created by Tommy.
import { env } from "cloudflare:workers";

export function getDatabase() {
  if (!env.DB) throw new Error("Journal database unavailable");
  return env.DB;
}
