// Builds the FreshNest project report (Word) from report.json and chapters/*.md.
// Run: npm run build   (output: FreshNest-Project-Report.docx next to this file)
//
// Markdown supported in the chapters:
//   # CHAPTER 1 | INTRODUCTION   chapter title on a new page (two centred lines)
//   # ABSTRACT                   front-matter or references title on a new page
//   ## / ### / ####              headings (write the numbers yourself: "## 1.1 Background")
//   - item / 1. item             bullet and numbered lists (indent 2 spaces for a sub-item)
//   | a | b |                    tables; a line "Table 1.1: Caption" just above gives the caption
//   ![Figure 1.1: Caption](diagrams/x.png)   picture with caption (a placeholder box until the PNG exists)
//   ``` code ```                 code block
//   **bold**, *italic*, `code`, [[placeholder]] (yellow highlight)
//   \pagebreak                   page break;  <!-- comments --> are ignored

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, LevelFormat,
  NumberFormat, Packer, PageNumber, Paragraph, ShadingType, StyleLevel, Tab, Table,
  TableCell, TableLayoutType, TableOfContents, TableRow, TabStopType, TextRun,
  VerticalAlign, WidthType,
} from "docx";
import { estimatePageNumbers } from "docx/layout";
import { columnShares, isLabel, isReference, parse, parseInline } from "./markdown.mjs";
import { declarations, SIGNATURE_LINE, submissionStatement } from "./front.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "report.json"), "utf8"));

// A4 with 1 inch margins (sizes in twentieths of a point)
const PAGE = { width: 11906, height: 16838 };
const MARGIN = 1440;
const TEXT_WIDTH = PAGE.width - 2 * MARGIN;
const FONT = "Times New Roman";
const BODY = 24; // 12 pt (half-points)
const LINE = 360; // 1.5 line spacing

// ---------- inline text ----------

function toRuns(nodes, base) {
  return nodes.flatMap((n) => {
    if (n.t === "text") return [new TextRun({ ...base, text: n.s })];
    if (n.t === "code") return [new TextRun({ ...base, text: n.s, font: "Courier New", size: (base.size ?? BODY) - 2 })];
    if (n.t === "ph") return [new TextRun({ ...base, text: n.s, highlight: "yellow" })];
    if (n.t === "b") return toRuns(n.children, { ...base, bold: true });
    return toRuns(n.children, { ...base, italics: true });
  });
}

const runs = (text, base = {}) => toRuns(parseInline(text), base);

// ---------- blocks to Word ----------

let listInstance = 0;

function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// Width and height of a JPEG, from its start-of-frame marker.
function jpegSize(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error("Not a JPEG file");
}
const isPicture = (file) => /\.(png|jpe?g)$/i.test(file);
const isJpeg = (file) => /\.jpe?g$/i.test(file);

function figure(block, maxW = 600, maxH = 860) {
  const file = path.join(ROOT, block.src);
  const out = [];
  if (fs.existsSync(file) && isPicture(file)) {
    const data = fs.readFileSync(file);
    const { w, h } = isJpeg(file) ? jpegSize(data) : pngSize(data);
    const scale = Math.min(1, maxW / w, maxH / h);
    out.push(new Paragraph({
      // single line spacing: with the document's 1.5 spacing, Word would make the picture's line 1.5 times as tall
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60, line: 240 },
      children: [new ImageRun({ type: isJpeg(file) ? "jpg" : "png", data, transformation: { width: Math.round(w * scale), height: Math.round(h * scale) } })],
    }));
  } else {
    const border = { style: BorderStyle.DASHED, size: 6, color: "808080", space: 12 };
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 240, after: 120 },
      border: { top: border, bottom: border, left: border, right: border },
      children: [
        new TextRun({ text: "" }),
        new TextRun({ break: 2, text: `Figure to be added: ${block.caption.replace(/^Figure [\d.]+:\s*/, "")}`, highlight: "yellow", size: 22 }),
        new TextRun({ break: 1, text: `(save it as docs/report/${block.src})`, color: "666666", size: 20 }),
        new TextRun({ break: 2, text: "" }),
      ],
    }));
  }
  out.push(new Paragraph({ style: "FigureCaption", children: runs(block.caption) }));
  return out;
}

function table(rows) {
  const shares = columnShares(rows);
  const cols = shares.length;
  const widths = shares.map((f) => Math.floor(f * TEXT_WIDTH));
  widths[cols - 1] += TEXT_WIDTH - widths.reduce((a, b) => a + b, 0);
  const line = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  return new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line },
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,
      children: widths.map((w, j) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        shading: i === 0 ? { type: ShadingType.CLEAR, fill: "D9D9D9", color: "auto" } : undefined,
        children: (r[j] ?? "").split(/<br\s*\/?>/i).map((part) => new Paragraph({
          spacing: { line: 264, after: 0 },
          children: runs(part, { size: 22, bold: i === 0 || undefined }),
        })),
      })),
    })),
  });
}

function render(blocks, { firstOnNewPage = false } = {}) {
  const out = [];
  blocks.forEach((b, idx) => {
    const newPage = idx > 0 || firstOnNewPage;
    switch (b.type) {
      case "chapter":
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: newPage, spacing: { after: 0 }, children: runs(b.parts[0]) }));
        out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs(b.parts[1]) }));
        break;
      case "heading":
        if (b.level === 1) out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: newPage, children: runs(b.text) }));
        else out.push(new Paragraph({ heading: [null, null, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][b.level], children: runs(b.text) }));
        break;
      case "para": {
        const isRef = isReference(b.text);
        out.push(new Paragraph({
          keepNext: isLabel(b.text) || (blocks[idx + 1]?.type === "figure" && b.text.length <= 220) || undefined, // a label, or a short sentence that introduces a figure
          alignment: isRef ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
          indent: isRef ? { left: 567, hanging: 567 } : undefined,
          spacing: isRef ? { line: 276, after: 160 } : undefined,
          children: runs(b.text),
        }));
        break;
      }
      case "list": {
        listInstance++;
        for (const item of b.items) {
          out.push(new Paragraph({
            numbering: item.ordered
              ? { reference: "numbers", level: item.level, instance: listInstance }
              : { reference: "bullets", level: item.level },
            spacing: { after: 60 },
            alignment: AlignmentType.JUSTIFIED,
            children: runs(item.text),
          }));
        }
        break;
      }
      case "tableCaption":
        out.push(new Paragraph({ style: "TableCaption", children: runs(b.text) }));
        break;
      case "table":
        out.push(table(b.rows));
        out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case "figure":
        if (b.fullPage) out.push({ fullPage: figure(b, FULL_PAGE.maxW, FULL_PAGE.maxH) }); // becomes a section of its own
        else out.push(...figure(b));
        break;
      case "code":
        b.lines.forEach((l, k) => out.push(new Paragraph({
          style: "Code",
          spacing: { before: k === 0 ? 120 : 0, after: k === b.lines.length - 1 ? 160 : 0 },
          children: [new TextRun({ text: l.length ? l : " " })],
        })));
        break;
      case "pagebreak":
        out.push(new Paragraph({ pageBreakBefore: true, children: [] }));
        break;
    }
  });
  return out;
}

function chapter(file, opts) {
  return render(parse(fs.readFileSync(path.join(ROOT, "chapters", file), "utf8")), opts);
}

// ---------- fixed front pages ----------

const centered = (text, opts = {}) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: opts.before ?? 0, after: opts.after ?? 0, line: opts.line ?? 276 },
  children: runs(text, { size: opts.size ?? BODY, bold: opts.bold, italics: opts.italics }),
});

function titlePage() {
  const out = [];
  const logo = path.join(ROOT, "assets", "diu-logo.png");
  if (fs.existsSync(logo)) {
    const data = fs.readFileSync(logo);
    const { w, h } = pngSize(data);
    const width = 190;
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 200, after: 480, line: 240 }, // single spacing around the picture
      children: [new ImageRun({ type: "png", data, transformation: { width, height: Math.round((h / w) * width) } })],
    }));
  }
  out.push(centered(meta.title, { size: 34, bold: true, after: 720, line: 300 }));
  out.push(centered("Submitted By", { size: 26, bold: true, after: 120 }));
  out.push(centered(meta.studentName.toUpperCase(), { size: 26, bold: true, after: 60 }));
  out.push(centered(meta.studentId, { after: 600 }));
  out.push(centered("Supervised By", { size: 26, bold: true, after: 120 }));
  out.push(centered(meta.supervisorName, { size: 26, bold: true, after: 60 }));
  out.push(centered(meta.supervisorDesignation, { after: 60 }));
  out.push(centered(`Department of ${meta.department}`, { after: 60 }));
  out.push(centered(meta.university, { after: 720 }));
  out.push(centered(submissionStatement(meta), { italics: true, after: 720, line: 300 }));
  out.push(centered(`©All Rights Reserved by ${meta.university}`, { size: 22, bold: true }));
  return out;
}

const frontTitle = (text, pageBreak = true) =>
  new Paragraph({ style: "FrontTitle", pageBreakBefore: pageBreak, children: runs(text) });
const heading1 = (text, pageBreak = true) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, children: runs(text) });
const body = (text) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: runs(text) });
const plain = (text, opts = {}) => new Paragraph({
  spacing: { line: opts.line ?? 276, after: opts.after ?? 0, before: opts.before ?? 0 },
  children: runs(text, { size: opts.size ?? BODY, bold: opts.bold }),
});

// Supervisor's and student's declarations, laid out like the user's sample: the text,
// a wide gap for the signature, the signature line, then name, designation or ID, and a blank date.
function declarationPages() {
  return declarations(meta).flatMap((d, k) => [
    heading1(d.title, k > 0),
    body(d.text),
    new Paragraph({ spacing: { before: 3240, after: 0 }, children: [new TextRun(SIGNATURE_LINE)] }),
    new Paragraph({ spacing: { after: 0 }, children: runs(d.signature) }),
    ...d.fields.map((f, i) => new Paragraph({ spacing: { before: i === 0 ? 300 : 0, after: 100 }, children: runs(f) })),
  ]);
}

function contents() {
  return [
    frontTitle("TABLE OF CONTENTS"),
    new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-4" }),
    heading1("LIST OF FIGURES"),
    new TableOfContents("List of Figures", { hyperlink: true, stylesWithLevels: [new StyleLevel("FigureCaption", 1)] }),
    heading1("LIST OF TABLES"),
    new TableOfContents("List of Tables", { hyperlink: true, stylesWithLevels: [new StyleLevel("TableCaption", 1)] }),
  ];
}

// ---------- document ----------

// The DIU samples put the page number near the middle of the footer line, not at the right edge.
const FOOTER_NUMBER_AT = 5500;

// shift: extra indent on pages with a narrower left margin, so the footer stays in the same place on every page
function footer(shift = 0) {
  return new Footer({
    children: [new Paragraph({
      spacing: { line: 240, after: 0 },
      indent: shift ? { left: shift } : undefined,
      tabStops: [{ type: TabStopType.LEFT, position: FOOTER_NUMBER_AT + shift }],
      children: [
        new TextRun({ text: `\u00a9${meta.university}`, size: 22 }),
        new TextRun({ children: [new Tab(), PageNumber.CURRENT], size: 22 }),
      ],
    })],
  });
}

const page = (numbering) => ({
  page: {
    size: PAGE,
    margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, footer: 708 },
    ...(numbering ? { pageNumbers: numbering } : {}),
  },
});

// A figure marked "fullpage" (the ER diagram) gets a page of its own with 0.1-inch margins (the user's choice), 0.7 inch at the bottom
// so that the footer stays where it is on the other pages; the page numbers carry on. maxH leaves room for the caption.
const FULL_MARGIN = { top: 144, bottom: 1008, left: 144, right: 144, footer: 708 };
const FULL_PAGE = {
  maxW: Math.floor(((PAGE.width - FULL_MARGIN.left - FULL_MARGIN.right) / 1440) * 96),
  maxH: Math.floor(((PAGE.height - FULL_MARGIN.top - FULL_MARGIN.bottom) / 1440) * 96) - 60,
};

const heading = (id, name, size, extra = {}) => ({
  id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
  run: { font: FONT, size, bold: true, color: "000000" },
  paragraph: { keepNext: true, keepLines: true, ...extra },
});

const tocStyle = (level) => ({
  id: `TOC${level}`, name: `toc ${level}`, basedOn: "Normal", next: "Normal",
  run: { font: FONT, size: BODY },
  paragraph: { spacing: { line: 300, after: 40 }, indent: { left: (level - 1) * 360 } },
});

// The chapters, split into sections around "fullpage" figures (each of those is a section of its own).
const bodyItems = fs.readdirSync(path.join(ROOT, "chapters"))
  .filter((f) => f.endsWith(".md") && f !== "00-front.md")
  .sort()
  .flatMap((f, k) => chapter(f, { firstOnNewPage: k > 0 }));
const bodySections = [{ full: false, children: [] }];
for (const item of bodyItems) {
  if (item?.fullPage) bodySections.push({ full: true, children: item.fullPage }, { full: false, children: [] });
  else bodySections.at(-1).children.push(item);
}
while (bodySections.length && !bodySections.at(-1).children.length) bodySections.pop();

const doc = new Document({
  creator: meta.studentName,
  title: meta.title,
  description: "Final year project report",
  features: { updateFields: true },
  pageNumbers: estimatePageNumbers,
  styles: {
    default: { document: { run: { font: FONT, size: BODY }, paragraph: { spacing: { line: LINE, after: 120 } } } },
    paragraphStyles: [
      heading("Heading1", "heading 1", 32, { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 360 }, outlineLevel: 0 }),
      heading("Heading2", "heading 2", 28, { spacing: { before: 240, after: 120 }, outlineLevel: 1 }),
      heading("Heading3", "heading 3", 24, { spacing: { before: 200, after: 100 }, outlineLevel: 2 }),
      { ...heading("Heading4", "heading 4", 24, { spacing: { before: 160, after: 80 }, outlineLevel: 3 }), run: { font: FONT, size: 24, bold: true, italics: true, color: "000000" } },
      { id: "FrontTitle", name: "Front Title", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 32, bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 360 }, keepNext: true } },
      { id: "FigureCaption", name: "FigureCaption", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 22, bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 60, after: 240, line: 276 } } },
      { id: "TableCaption", name: "TableCaption", basedOn: "Normal", next: "Normal", run: { font: FONT, size: 22, bold: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120, line: 276 }, keepNext: true } },
      { id: "Code", name: "Code", basedOn: "Normal", run: { font: "Courier New", size: 17 }, paragraph: { spacing: { line: 240 }, shading: { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" } } },
      tocStyle(1), tocStyle(2), tocStyle(3), tocStyle(4),
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ],
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ],
      },
    ],
  },
  sections: [
    { properties: page(), children: titlePage() },
    {
      properties: page({ start: 1, formatType: NumberFormat.LOWER_ROMAN }),
      footers: { default: footer() },
      children: [...declarationPages(), ...chapter("00-front.md", { firstOnNewPage: true }), ...contents()],
    },
    ...bodySections.map((s, k) => ({
      properties: s.full
        ? { page: { size: PAGE, margin: FULL_MARGIN, pageNumbers: { formatType: NumberFormat.DECIMAL } } }
        : page(k === 0 ? { start: 1, formatType: NumberFormat.DECIMAL } : { formatType: NumberFormat.DECIMAL }),
      footers: { default: footer(s.full ? MARGIN - FULL_MARGIN.left : 0) },
      children: s.children,
    })),
  ],
});

const outFile = path.join(ROOT, meta.output);
fs.writeFileSync(outFile, await Packer.toBuffer(doc));
console.log(`Written ${path.relative(process.cwd(), outFile) || outFile}`);
