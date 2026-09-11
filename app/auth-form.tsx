"use client";
// Created by Tommy.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "./language-provider";
import { isLanguage } from "@/lib/i18n";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function AuthForm({ configured, reset = false, linkError = false }: {
  configured: boolean; reset?: boolean; linkError?: boolean;
}) {
  const { t, language, setLanguage } = useLanguage();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError ? "authLinkExpired" : "");
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !configured) return;
    setBusy(true); setError(""); setSent(false);
    try {
      const client = createClient();
      const callback = `${window.location.origin}/auth/callback`;
      if (reset) {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        window.location.assign("/");
      } else if (mode === "signup") {
        const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: callback } });
        if (error) throw error;
        if (data.session) window.location.assign("/");
        else setSent(true);
      } else if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${callback}?next=/reset-password` });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign("/");
      }
    } catch {
      setError("authFailed");
    } finally { setBusy(false); }
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
      <h1>{reset ? t("newPassword") : mode === "signup" ? t("createAccount") : mode === "forgot" ? t("resetPassword") : t("signIn")}</h1>
      <p className="muted">{t("privateJournalHint")}</p>
      {!configured && <p role="status" className="form-error">{t("authNotConfigured")}</p>}
      <form className="entry-form" onSubmit={submit}>
        <fieldset disabled={busy || !configured}>
          {!reset && <label>{t("email")}<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>}
          {(reset || mode !== "forgot") && <label>{t("password")}<input type="password" autoComplete={reset || mode === "signup" ? "new-password" : "current-password"} required minLength={reset || mode === "signup" ? 8 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          {error && <p className="form-error" role="alert">{error === "authLinkExpired" ? t("authLinkExpired") : t("authFailed")}</p>}
          {sent && <p className="positive" role="status">{t("checkEmail")}</p>}
          <button className="primary-button" type="submit">{busy ? t("saving") : reset ? t("savePassword") : mode === "signup" ? t("createAccount") : mode === "forgot" ? t("sendResetLink") : t("signIn")}</button>
        </fieldset>
      </form>
      {!reset && <div className="auth-links">
        <button className="text-button" disabled={busy} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSent(false); }}>{mode === "login" ? t("createAccount") : t("signIn")}</button>
        {mode === "login" && <button className="text-button" disabled={busy} onClick={() => { setMode("forgot"); setError(""); setSent(false); }}>{t("forgotPassword")}</button>}
      </div>}
      <a className="text-button" href="/demo">{t("tryDemo")}</a>
    </section>
  </main>;
}
