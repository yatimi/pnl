"use client";
// Created by Tommy.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "./language-provider";
import { isLanguage } from "@/lib/i18n";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function AuthForm({ configured, linkError = false }: {
  configured: boolean; linkError?: boolean;
}) {
  const { t, language, setLanguage } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(linkError);
  async function signIn() {
    if (busy || !configured) return;
    setBusy(true);
    setFailed(false);
    try {
      const client = createClient();
      const { error } = await client.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return <main className="auth-shell">
    <div className="auth-heading">
      <a className="brand" href="/">pnl<span className="brand-pixel">.</span></a>
      <ToggleGroup type="single" className="language-switch" value={language} onValueChange={(value) => { if (isLanguage(value)) setLanguage(value); }} aria-label={t("languageLabel")}>
        <ToggleGroupItem value="en" lang="en" aria-label="English">EN</ToggleGroupItem>
        <ToggleGroupItem value="ru" lang="ru" aria-label="Русский">RU</ToggleGroupItem>
      </ToggleGroup>
    </div>
    <section className="auth-panel">
      <h1>{t("signIn")}</h1>
      <p className="muted">{t("privateJournalHint")}</p>
      {!configured && <p role="status" className="form-error">{t("authNotConfigured")}</p>}
      {failed && <p className="form-error" role="alert">{t("authFailed")}</p>}
      <button className="primary-button" disabled={busy || !configured} onClick={() => void signIn()}>
        {busy ? t("openingGitHub") : t("signInGitHub")}
      </button>
      <p className="small muted auth-links">{t("githubAccessHint")}</p>
      <a className="text-button" href="/demo">{t("tryDemo")}</a>
    </section>
  </main>;
}
