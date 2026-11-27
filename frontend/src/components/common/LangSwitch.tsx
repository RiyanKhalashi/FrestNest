"use client";
// "English | বাংলা" switch for farmers, dealers, transporters and the public pages. The page reloads in the new language.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getLang, storeLang, type Lang } from "@/lib/i18n/lang";

export function LangSwitch({ signedIn = false, className = "" }: { signedIn?: boolean; className?: string }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => { setLang(getLang()); }, []);

  async function choose(l: Lang) {
    if (l === lang) return;
    storeLang(l, true); // stays "pending" until the account has it too
    if (signedIn) { try { await api("/profile", { method: "PATCH", body: { language: l } }); storeLang(l); } catch { /* copied to the account later */ } }
    window.location.reload();
  }

  return (
    <div className={"lang-sw " + className} role="group" aria-label="Language / ভাষা" data-i18n-skip="">
      <button type="button" className={lang === "en" ? "on" : ""} aria-pressed={lang === "en"} onClick={() => choose("en")}>English</button>
      <button type="button" className={lang === "bn" ? "on" : ""} aria-pressed={lang === "bn"} onClick={() => choose("bn")} lang="bn">বাংলা</button>
    </div>
  );
}
