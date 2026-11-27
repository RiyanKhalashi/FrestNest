"use client";
// Bangla mode: translates the visible English text of the page in place, and keeps doing so as React updates it.
// React keeps owning the text nodes; when it writes a new English value, the observer sees it and translates again.
// Admin pages are left in English.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getLang, isAdminPath } from "@/lib/i18n/lang";
import { tr, lookup, finish, setNames } from "@/lib/i18n/translate";

const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "NOSCRIPT", "CODE"]);
const ATTRS = ["placeholder", "title", "aria-label"];
const NAMES_KEY = "fn-names-v1";

const orig = new WeakMap<Text, string>(); // React's English value
const written = new WeakMap<Text, string>(); // what we wrote last
const attrOrig = new WeakMap<Element, Record<string, string>>();
const attrWritten = new WeakMap<Element, Record<string, string>>();

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.hasAttribute("data-i18n-skip") || (e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

/** React's current English value of a text node. */
function source(n: Text): string {
  const v = n.nodeValue ?? "";
  if (written.get(n) === v) return orig.get(n) ?? v;
  orig.set(n, v);
  return v;
}

function write(n: Text, v: string) {
  written.set(n, v);
  if (n.nodeValue !== v) n.nodeValue = v;
}

/** Translates the direct text children of an element. Several text pieces side by side ("Only ", "3", " left")
 *  are first tried as one sentence, so the Bangla word order can differ from the English. */
function doElement(el: Element) {
  if (skipped(el)) return;
  const texts: Text[] = [];
  let onlyText = true;
  el.childNodes.forEach((c) => { if (c.nodeType === 3) texts.push(c as Text); else if (c.nodeType === 1) onlyText = false; });
  if (!texts.length) return;
  if (onlyText && texts.length > 1) {
    const src = texts.map(source);
    const joined = src.join("");
    const whole = lookup(joined);
    if (whole !== null) {
      const lead = joined.match(/^\s*/)![0], tail = joined.match(/\s*$/)![0];
      write(texts[0], lead + finish(whole) + tail);
      for (let i = 1; i < texts.length; i++) write(texts[i], "");
      return;
    }
    texts.forEach((t, i) => write(t, tr(src[i])));
    return;
  }
  const btn = !!el.closest("button, .btn");
  texts.forEach((t) => write(t, tr(source(t), btn)));
}

function doAttrs(el: Element) {
  if (el.closest("[data-i18n-skip]")) return; // placeholders of inputs and textareas are translated too
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v === null) continue;
    const w = attrWritten.get(el) ?? {};
    let o = attrOrig.get(el) ?? {};
    if (w[a] !== v) { o = { ...o, [a]: v }; attrOrig.set(el, o); }
    const t = tr(o[a] ?? v);
    attrWritten.set(el, { ...w, [a]: t });
    if (t !== v) el.setAttribute(a, t);
  }
}

function walk(root: Element) {
  doElement(root); doAttrs(root);
  root.querySelectorAll("*").forEach((el) => { doElement(el); doAttrs(el); });
}

async function loadNames() {
  try {
    const cached = localStorage.getItem(NAMES_KEY);
    if (cached) setNames(JSON.parse(cached));
  } catch { /* ignore */ }
  try {
    const [loc, prod] = await Promise.all([
      fetch("/api/meta/locations").then((r) => r.json()) as Promise<{ districts: { name: string; nameBn: string | null; upazilas: { name: string; nameBn: string | null }[] }[] }>,
      fetch("/api/meta/products").then((r) => r.json()) as Promise<{ products: { nameEn: string; nameBn: string }[] }>,
    ]);
    const m: Record<string, string> = {};
    for (const d of loc.districts) {
      if (d.nameBn) m[d.name] = d.nameBn;
      for (const u of d.upazilas) if (u.nameBn) m[u.name] = u.nameBn;
    }
    for (const p of prod.products) m[p.nameEn] = p.nameBn;
    setNames(m);
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(m)); } catch { /* ignore */ }
    return true;
  } catch { return false; }
}

export function Translator() {
  const path = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    if (getLang() !== "bn" || isAdminPath(path)) { html.classList.remove("i18n-wait"); html.lang = "en"; return; }
    html.lang = "bn";
    html.classList.add("lang-bn");
    let busy = false;
    const obs = new MutationObserver((records) => {
      if (busy) return;
      busy = true;
      try {
        const els = new Set<Element>();
        for (const r of records) {
          if (r.type === "characterData") { if (r.target.parentElement) els.add(r.target.parentElement); }
          else if (r.type === "attributes") { if (r.target instanceof Element) doAttrs(r.target); }
          else {
            if (r.target instanceof Element) els.add(r.target);
            r.addedNodes.forEach((n) => { if (n instanceof Element) walk(n); });
          }
        }
        els.forEach(doElement);
      } finally { busy = false; obs.takeRecords(); }
    });
    walk(document.body);
    html.classList.remove("i18n-wait");
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    loadNames().then((ok) => { if (ok) { busy = true; walk(document.body); obs.takeRecords(); busy = false; } });
    return () => obs.disconnect();
  }, [path]);
  return null;
}

/** Runs before the first paint: hides the page for a moment in Bangla mode so English does not flash. */
export const PRE_PAINT = `try{if(localStorage.getItem("fn-lang")==="bn"&&!/^\\/admin(\\/|$)/.test(location.pathname)){var h=document.documentElement;h.classList.add("lang-bn","i18n-wait");h.lang="bn";setTimeout(function(){h.classList.remove("i18n-wait")},2500)}}catch(e){}`;
