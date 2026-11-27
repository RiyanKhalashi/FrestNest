// Reads the report's Markdown. Shared by build.mjs (Word) and preview.mjs (PDF).

export function smartQuotes(s) {
  return s
    .replace(/(\w)'(\w)/g, "$1’$2")
    .replace(/(^|[\s([{“])'/g, "$1‘")
    .replace(/'/g, "’")
    .replace(/(^|[\s([{‘])"/g, "$1“")
    .replace(/"/g, "”");
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[\[[^\]]+\]\])/g;

// Inline text to nodes: { t: "text" | "code" | "ph", s } or { t: "b" | "i", children }.
// Text and placeholders come back with curly quotes; code stays as written.
export function parseInline(text) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push({ t: "text", s: smartQuotes(text.slice(last, m.index)) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ t: "b", children: parseInline(tok.slice(2, -2)) });
    else if (tok.startsWith("`")) out.push({ t: "code", s: tok.slice(1, -1) });
    else if (tok.startsWith("[[")) out.push({ t: "ph", s: smartQuotes(tok.slice(2, -2)) });
    else out.push({ t: "i", children: parseInline(tok.slice(1, -1)) });
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ t: "text", s: smartQuotes(text.slice(last)) });
  return out;
}

const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const TABLE_CAPTION = /^Table \d+(\.\d+)*:\s/;
const FIGURE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/; // ![caption](file.png) or ![caption](file.png "fullpage")

// Markdown to blocks: chapter, heading, para, list, tableCaption, table, figure, code, pagebreak.
export function parse(src) {
  const lines = src.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    if (trimmed.startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push({ type: "code", lines: code });
      continue;
    }
    if (trimmed === "\\pagebreak") { blocks.push({ type: "pagebreak" }); i++; continue; }

    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      const level = h[1].length;
      if (level === 1 && h[2].includes("|")) blocks.push({ type: "chapter", parts: h[2].split("|").map((s) => s.trim()) });
      else blocks.push({ type: "heading", level, text: h[2].trim() });
      i++;
      continue;
    }

    const fig = FIGURE.exec(trimmed);
    if (fig) { blocks.push({ type: "figure", caption: fig[1], src: fig[2], fullPage: fig[3] === "fullpage" }); i++; continue; }

    if (TABLE_CAPTION.test(trimmed)) { blocks.push({ type: "tableCaption", text: trimmed }); i++; continue; }

    if (trimmed.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      blocks.push({ type: "table", rows });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const items = [];
      while (i < lines.length && lines[i].trim()) {
        const m = LIST_ITEM.exec(lines[i]);
        if (m) items.push({ level: Math.min(1, Math.floor(m[1].length / 2)), ordered: /\d/.test(m[2]), text: m[3] });
        else items[items.length - 1].text += " " + lines[i].trim();
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\||!\[|```|\\pagebreak)/.test(lines[i].trim()) && !LIST_ITEM.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "para", text: para.join(" ") });
  }
  return blocks;
}

export const isReference = (text) => /^\[\d+\]\s/.test(text);

// Share of the table width for each column. Short columns, such as dates, get the room they need,
// and the longer columns share the rest by how much text they hold.
export function columnShares(rows) {
  const ACROSS = 88; // about this many characters fit across the page at 11 pt
  const cols = Math.max(...rows.map((r) => r.length));
  const length = (cell) => (cell ?? "").replace(/\*\*|\[\[|\]\]|`/g, "").split(/<br\s*\/?>/i).reduce((m, part) => Math.max(m, part.length), 0);
  const need = Array.from({ length: cols }, (_, j) => Math.max(...rows.map((r) => length(r[j]))) + 2);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  let width;
  if (sum(need) <= ACROSS) width = need.map((n) => (n / sum(need)) * ACROSS);
  else {
    const fixed = need.map((n) => (n <= ACROSS / cols ? n : 0));
    const flexible = need.map((n, j) => (fixed[j] ? 0 : Math.min(n, 60)));
    const rest = ACROSS - sum(fixed);
    width = need.map((_, j) => (fixed[j] ? fixed[j] : (flexible[j] / sum(flexible)) * rest));
  }
  // No column may be narrower than its longest word plus the cell margins, or words such as
  // "TC-06" and "Assertions" break in the middle; the room comes from the columns that have spare.
  const word = (cell) => Math.max(0, ...(cell ?? "").replace(/\*\*|\[\[|\]\]|`/g, "").split(/<br\s*\/?>|\s+/i).map((w) => w.length));
  const least = Array.from({ length: cols }, (_, j) => Math.max(...rows.map((r) => word(r[j]))) + 4);
  for (let pass = 0; pass < 3; pass++) {
    const short = width.map((w, j) => Math.max(0, least[j] - w));
    const missing = sum(short);
    if (missing < 0.01) break;
    const spare = width.map((w, j) => (short[j] ? 0 : Math.max(0, w - least[j])));
    if (sum(spare) <= 0) break;
    width = width.map((w, j) => (short[j] ? least[j] : w - (spare[j] / sum(spare)) * Math.min(missing, sum(spare))));
  }
  return width.map((w) => w / sum(width));
}

// A paragraph that is only bold text, such as "**Assessment: Feasible**", labels what follows it,
// so it is kept on the same page as the next paragraph or list.
export const isLabel = (text) => /^\*\*[^*]+\*\*$/.test(text.trim());
