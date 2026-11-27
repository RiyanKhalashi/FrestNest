// Makes a PDF reading copy of the report with Google Chrome, for reviewing on a computer without Word.
// Run: npm run preview   (output: FreshNest-Report-Preview.pdf)
// It has the cover, the declarations, acknowledgements, abstract, table of contents, list of figures and
// list of tables (pages i, ii, ...) and the chapters (pages 1, 2, ...). The contents get their page numbers by
// printing the chapters first and finding each heading and caption in that PDF. Page breaks here can differ
// slightly from Word's; the Word file builds its own contents when Word updates its fields.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { chromium } from "playwright-core";
import { declarations, SIGNATURE_LINE, submissionStatement } from "./front.mjs";
import { columnShares, isLabel, isReference, parse, parseInline } from "./markdown.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "report.json"), "utf8"));
const OUTPUT = path.join(ROOT, "FreshNest-Report-Preview.pdf");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(nodes) {
  return nodes.map((n) => {
    if (n.t === "text") return esc(n.s);
    if (n.t === "code") return `<code>${esc(n.s)}</code>`;
    if (n.t === "ph") return `<mark>${esc(n.s)}</mark>`;
    if (n.t === "b") return `<b>${inline(n.children)}</b>`;
    return `<i>${inline(n.children)}</i>`;
  }).join("");
}
const html = (text) => inline(parseInline(text));
const png = (file) => `data:image/${/\.jpe?g$/i.test(file) ? "jpeg" : "png"};base64,${fs.readFileSync(path.join(ROOT, file)).toString("base64")}`;

// ---------- Markdown blocks ----------

function list(items) {
  const tag = (ordered) => (ordered ? "ol" : "ul");
  let out = `<${tag(items[0].ordered)}>`;
  for (let k = 0; k < items.length; k++) {
    out += `<li>${html(items[k].text)}`;
    const sub = [];
    while (k + 1 < items.length && items[k + 1].level === 1) sub.push(items[++k]);
    if (sub.length) out += `<${tag(sub[0].ordered)} class="sub">${sub.map((s) => `<li>${html(s.text)}</li>`).join("")}</${tag(sub[0].ordered)}>`;
    out += "</li>";
  }
  return out + `</${tag(items[0].ordered)}>`;
}

// Same column widths as the Word tables
function table(rows) {
  const weights = columnShares(rows);
  const cell = (tagName, text) => `<${tagName}>${(text ?? "").split(/<br\s*\/?>/i).map(html).join("<br>")}</${tagName}>`;
  return `<table><colgroup>${weights.map((w) => `<col style="width:${(w * 100).toFixed(2)}%">`).join("")}</colgroup>`
    + `<thead><tr>${weights.map((_, j) => cell("th", rows[0][j])).join("")}</tr></thead>`
    + `<tbody>${rows.slice(1).map((r) => `<tr>${weights.map((_, j) => cell("td", r[j])).join("")}</tr>`).join("")}</tbody></table>`;
}

function figure(b) {
  const file = path.join(ROOT, b.src);
  const pic = fs.existsSync(file) && /\.(png|jpe?g)$/i.test(file)
    ? `<figure><img src="${png(b.src)}" alt=""></figure>`
    : `<div class="figbox"><mark>Figure to be added: ${esc(b.caption.replace(/^Figure [\d.]+:\s*/, ""))}</mark><small>(save it as docs/report/${esc(b.src)})</small></div>`;
  const out = pic + `<p class="fcap">${html(b.caption)}</p>`;
  return b.fullPage ? `<div class="fullpage">${out}</div>` : out; // a page of its own with 0.1-inch margins
}

function render(blocks, first) {
  return blocks.map((b, idx) => {
    const cls = first && idx === 0 ? ' class="first"' : "";
    switch (b.type) {
      case "chapter": return `<h1${cls}>${b.parts.map((p) => `<span>${html(p)}</span>`).join("")}</h1>`;
      case "heading": return `<h${b.level}${b.level === 1 ? cls : ""}>${html(b.text)}</h${b.level}>`;
      case "para": return `<p${isReference(b.text) ? ' class="ref"' : isLabel(b.text) || (blocks[idx + 1]?.type === "figure" && b.text.length <= 220) ? ' class="label"' : ""}>${html(b.text)}</p>`;
      case "list": return list(b.items);
      case "tableCaption": return `<p class="tcap">${html(b.text)}</p>`;
      case "table": return table(b.rows);
      case "figure": return figure(b);
      case "code": return `<pre>${esc(b.lines.join("\n"))}</pre>`;
      case "pagebreak": return '<div class="pb"></div>';
      default: return "";
    }
  }).join("\n");
}

// ---------- fixed pages ----------

function cover() {
  const line = (text, style) => `<p class="c" style="${style}">${html(text)}</p>`;
  const logo = fs.existsSync(path.join(ROOT, "assets", "diu-logo.png"))
    ? `<p class="c" style="margin:10pt 0 24pt"><img src="${png("assets/diu-logo.png")}" style="width:1.98in" alt=""></p>` : "";
  return logo
    + line(meta.title, "font-size:17pt;font-weight:bold;line-height:1.25;margin-bottom:36pt")
    + line("Submitted By", "font-size:13pt;font-weight:bold;margin-bottom:6pt")
    + line(meta.studentName.toUpperCase(), "font-size:13pt;font-weight:bold;margin-bottom:3pt")
    + line(meta.studentId, "margin-bottom:30pt")
    + line("Supervised By", "font-size:13pt;font-weight:bold;margin-bottom:6pt")
    + line(meta.supervisorName, "font-size:13pt;font-weight:bold;margin-bottom:3pt")
    + line(meta.supervisorDesignation, "margin-bottom:3pt")
    + line(`Department of ${meta.department}`, "margin-bottom:3pt")
    + line(meta.university, "margin-bottom:36pt")
    + line(submissionStatement(meta), "font-style:italic;line-height:1.25;margin-bottom:36pt")
    + line(`©All Rights Reserved by ${meta.university}`, "font-size:11pt;font-weight:bold");
}

function declarationPages() {
  return declarations(meta).map((d, k) =>
    `<h1${k === 0 ? ' class="first"' : ""}>${html(d.title)}</h1><p>${html(d.text)}</p>`
    + `<p class="sig">${SIGNATURE_LINE}</p><p class="plain">${html(d.signature)}</p>`
    + d.fields.map((f, i) => `<p class="plain field"${i === 0 ? ' style="margin-top:15pt"' : ""}>${html(f)}</p>`).join("")).join("");
}

// ---------- contents pages ----------

// The lines of text on each page of a PDF, to find the page each heading and caption landed on.
async function pageLines(bytes) {
  const pdf = await getDocument({ data: new Uint8Array(bytes), verbosity: 0, useSystemFonts: true, disableFontFace: true, isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const { items } = await (await pdf.getPage(i)).getTextContent();
    const rows = new Map();
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push(it);
    }
    pages.push([...rows.entries()].sort((a, b) => b[0] - a[0])
      .map(([, row]) => row.sort((a, b) => a.transform[4] - b.transform[4]).map((x) => x.str).join(" ")));
  }
  await pdf.destroy();
  return pages;
}

const squash = (s) => s.replace(/\*\*|`/g, "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, "").toLowerCase();

// The first page, from page `from` on, with a line that is the target, starts with it, or (for a heading that
// wraps) is the start of it. Short targets such as "Summary" must match a whole line.
function findPage(pages, target, from, exact = false) {
  const t = squash(target);
  const whole = exact || t.length < 12;
  for (let p = Math.max(0, from); p < pages.length; p++) {
    for (const line of pages[p]) {
      const l = squash(line);
      if (l === t || (!whole && (l.startsWith(t) || (l.length >= 15 && t.startsWith(l))))) return p;
    }
  }
  return -1;
}

// Entries in document order; each list is searched forwards from the previous entry's page.
function locate(list, pages) {
  let from = 0;
  for (const e of list) {
    const p = findPage(pages, e.find ?? e.text, from, e.exact);
    if (p < 0) { console.warn("Contents: not found in the PDF:", e.text); e.page = null; continue; }
    e.page = p;
    from = p;
  }
}

function contentsEntries(files) {
  const toc = [], figures = [], tables = [];
  for (const f of files) {
    for (const b of parse(read(path.join("chapters", f)))) {
      if (b.type === "chapter") toc.push({ level: 0, text: `${b.parts[0]} ${b.parts[1]}`, find: b.parts[0], exact: true });
      else if (b.type === "heading") toc.push({ level: Math.max(0, b.level - 1), text: b.text });
      else if (b.type === "figure") figures.push({ text: b.caption });
      else if (b.type === "tableCaption") tables.push({ text: b.text });
    }
  }
  return { toc, figures, tables };
}

// The front pages listed in the contents, as the batchmate's report does.
const frontEntries = () => [
  ...declarations(meta).map((d) => ({ text: d.title, exact: true })),
  ...parse(read("chapters/00-front.md")).filter((b) => b.type === "heading").map((b) => ({ text: b.text, exact: true })),
  { text: "LIST OF FIGURES", exact: true },
  { text: "LIST OF TABLES", exact: true },
];

const roman = (n) => [["m", 1000], ["cm", 900], ["d", 500], ["cd", 400], ["c", 100], ["xc", 90], ["l", 50], ["xl", 40], ["x", 10], ["ix", 9], ["v", 5], ["iv", 4], ["i", 1]]
  .reduce((s, [k, v]) => { while (n >= v) { s += k; n -= v; } return s; }, "");
const tocLine = (text, num, cls) => `<p class="toc ${cls}"><span class="t">${html(text)}</span><span class="d"></span><span class="n">${num}</span></p>`;
const pageOf = (e, fmt) => (e.page == null ? "" : fmt(e.page + 1));

function contentsPages({ front, toc, figures, tables }) {
  return `<h1>TABLE OF CONTENTS</h1><p class="toch"><span>CONTENTS</span><span>PAGE</span></p>`
    + front.map((e) => tocLine(e.text, pageOf(e, roman), "front")).join("")
    + toc.map((e) => tocLine(e.text, pageOf(e, String), "l" + e.level)).join("")
    + `<h1>LIST OF FIGURES</h1><p class="toch"><span>FIGURES</span><span>Pages</span></p>`
    + figures.map((e) => tocLine(e.text, pageOf(e, String), "cap")).join("")
    + `<h1>LIST OF TABLES</h1><p class="toch"><span>TABLES</span><span>Pages</span></p>`
    + tables.map((e) => tocLine(e.text, pageOf(e, String), "cap")).join("");
}

// ---------- CSS ----------

// Footer like the DIU samples: the university name, then the page number near the middle of the line.
const footer = (counter) => `@bottom-left { content: "\u00a9${meta.university}${"\u00a0".repeat(40)}" counter(page${counter}); `
  + 'font-family: "Times New Roman", Times, serif; font-size: 11pt; white-space: pre; vertical-align: middle; }';

const CSS = `
html { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; }
body { margin: 0; }
p { margin: 0 0 6pt; line-height: 1.5; text-align: justify; orphans: 2; widows: 2; }
p.c { text-align: center; line-height: 1.15; margin: 0; }
p.label { break-after: avoid; }
p.ref { text-align: left; line-height: 1.15; padding-left: 0.4in; text-indent: -0.4in; margin-bottom: 8pt; }
p.sig { margin: 162pt 0 0; text-align: left; }
p.plain { margin: 0; text-align: left; }
p.field { margin-bottom: 5pt; }
h1 { font-size: 16pt; text-align: center; margin: 0 0 18pt; line-height: 1.5; break-before: page; break-after: avoid; }
h1.first { break-before: auto; }
h1 span { display: block; }
h2 { font-size: 14pt; margin: 12pt 0 6pt; break-after: avoid; }
h3 { font-size: 12pt; margin: 10pt 0 5pt; break-after: avoid; }
h4 { font-size: 12pt; font-style: italic; margin: 8pt 0 4pt; break-after: avoid; }
ul, ol { margin: 0 0 6pt; padding-left: 0.5in; }
ol.sub { list-style-type: lower-alpha; }
ul.sub { list-style-type: "\\2013\\00a0\\00a0"; }
li { line-height: 1.5; text-align: justify; margin-bottom: 3pt; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 11pt; margin: 0 0 12pt; }
th, td { border: 0.75pt solid #000; padding: 3pt 5pt; line-height: 1.2; text-align: left; vertical-align: middle; }
th { background: #d9d9d9; }
tr { break-inside: avoid; }
thead { display: table-header-group; }
.tcap, .fcap { text-align: center; font-weight: bold; font-size: 11pt; line-height: 1.15; }
.tcap { margin: 6pt 0; break-after: avoid; }
.fcap { margin: 3pt 0 12pt; }
.figbox { border: 0.75pt dashed #808080; text-align: center; padding: 24pt 12pt; margin: 12pt 0 4pt; font-size: 11pt; break-after: avoid; }
.figbox small { display: block; color: #666; font-size: 10pt; margin-top: 4pt; }
figure { margin: 6pt 0 3pt; text-align: center; break-after: avoid; }
figure img { max-width: 100%; max-height: 8.9in; }
.fullpage { page: fullpage; }
.fullpage figure { margin-top: 0; }
.fullpage figure img { max-height: 10.25in; }
mark { background: #ffff00; color: inherit; }
pre { font-family: "Courier New", monospace; font-size: 8.5pt; background: #f2f2f2; padding: 6pt; white-space: pre-wrap; line-height: 1.2; margin: 6pt 0 8pt; }
code { font-family: "Courier New", monospace; font-size: 11pt; }
.pb { break-after: page; }
p.toch { display: flex; justify-content: space-between; font-weight: bold; text-align: left; line-height: 1.3; margin: 0 0 8pt; }
p.toc { display: flex; align-items: baseline; text-align: left; line-height: 1.3; margin: 0 0 3pt; }
p.toc .t { flex: 0 1 auto; }
p.toc .d { flex: 1 1 auto; min-width: 12pt; margin: 0 4pt; border-bottom: 1.2pt dotted #000; transform: translateY(-3pt); }
p.toc .n { flex: 0 0 auto; min-width: 20pt; text-align: right; }
p.toc.l0 { font-weight: bold; margin-top: 6pt; }
p.toc.l1 { padding-left: 0.3in; }
p.toc.l2 { padding-left: 0.6in; }
p.toc.l3 { padding-left: 0.9in; }
`;

const doc = (pageRule, bodyHtml) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(meta.title)}</title>`
  + `<style>@page { size: A4; margin: 1in; ${pageRule} }`
  // the footer sits where it is on the other pages: text centred 0.5 inch above the page edge, 1 inch from the left
  + `@page fullpage { size: A4; margin: 0.1in 0.1in 0.7in 0.1in; ${pageRule.replace("vertical-align: middle;", "vertical-align: top; padding-top: 0.12in; padding-left: 0.9in;")} }`
  + `${CSS}</style></head><body>${bodyHtml}</body></html>`;

const chapters = fs.readdirSync(path.join(ROOT, "chapters")).filter((f) => f.endsWith(".md") && f !== "00-front.md").sort();
const frontHtml = (contents) => doc(footer(", lower-roman"), declarationPages() + render(parse(read("chapters/00-front.md")), false) + contentsPages(contents));

// Each part is printed on its own so that its page numbers start at 1, then the parts are joined.
const browser = await chromium.launch({ channel: "chrome", headless: true });
const merged = await PDFDocument.create();
try {
  const tab = await browser.newPage();
  const print = async (part) => { await tab.setContent(part, { waitUntil: "load" }); return tab.pdf({ preferCSSPageSize: true, printBackground: true }); };

  // 1. The chapters (pages 1, 2, ...), then the page of every heading, figure and table in them.
  const body = await print(doc(footer(""), chapters.map((f, k) => render(parse(read(path.join("chapters", f))), k === 0)).join("\n")));
  const entries = contentsEntries(chapters);
  const bodyPages = await pageLines(body);
  for (const list of [entries.toc, entries.figures, entries.tables]) locate(list, bodyPages);

  // 2. The front pages with the contents. They list their own roman page numbers, so they are printed until
  //    those numbers stop changing (twice, normally).
  let front = frontEntries().map((e) => ({ ...e, page: 7 })), frontPdf;
  for (let pass = 0; pass < 4; pass++) {
    frontPdf = await print(frontHtml({ front, ...entries }));
    const found = frontEntries();
    locate(found, await pageLines(frontPdf));
    const same = found.every((e, k) => e.page === front[k].page);
    front = found;
    if (same) break;
  }

  // 3. Cover, front pages, chapters.
  for (const bytes of [await print(doc("", cover())), frontPdf, body]) {
    const pdf = await PDFDocument.load(bytes);
    for (const p of await merged.copyPages(pdf, pdf.getPageIndices())) merged.addPage(p);
  }
  const missing = [...entries.toc, ...entries.figures, ...entries.tables, ...front].filter((e) => e.page == null).length;
  console.log(`Contents: ${entries.toc.length} headings, ${entries.figures.length} figures, ${entries.tables.length} tables${missing ? `, ${missing} not found` : ""}`);
} finally {
  await browser.close();
}
merged.setTitle(`${meta.title} (preview)`);
merged.setAuthor(meta.studentName);
fs.writeFileSync(OUTPUT, await merged.save());
console.log(`Written ${path.basename(OUTPUT)}`);
