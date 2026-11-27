// Small helpers to write draw.io diagrams (mxGraph XML) for the report.
// The .drawio files open and edit in the VS Code draw.io extension; render-diagrams.mjs makes the PNGs.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Labels are HTML: "\n" becomes a line break; other text is escaped.
const label = (s) => String(s ?? "").split("\n").map((p) => p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br>");

export const S = {
  text: "text;html=1;whiteSpace=wrap;fontSize=12;",
  box: "rounded=0;whiteSpace=wrap;html=1;fontSize=12;",
  action: "rounded=1;whiteSpace=wrap;html=1;arcSize=20;fontSize=12;",
  decision: "rhombus;whiteSpace=wrap;html=1;fontSize=11;",
  start: "ellipse;html=1;fillColor=#000000;strokeColor=#000000;",
  end: "ellipse;html=1;shape=endState;fillColor=#000000;strokeColor=#000000;",
  lane: "swimlane;html=1;startSize=30;fontStyle=1;fontSize=13;fillColor=none;swimlaneFillColor=none;",
  flow: "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;labelBackgroundColor=#ffffff;",
  actor: "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=12;",
  usecase: "ellipse;whiteSpace=wrap;html=1;fontSize=12;",
  assoc: "endArrow=none;html=1;",
  include: "endArrow=open;dashed=1;html=1;endFill=0;fontSize=11;",
  general: "endArrow=block;endFill=0;html=1;endSize=12;",
};

export class Diagram {
  constructor(name) {
    this.name = name;
    this.cells = [];
    this.n = 0;
  }
  id() {
    return "c" + ++this.n;
  }
  vertex(value, x, y, w, h, style, parent = "1") {
    const id = this.id();
    this.cells.push({ kind: "v", id, value, x, y, w, h, style, parent });
    return id;
  }
  // Raw HTML label (already escaped HTML), for entity tables.
  htmlVertex(html, x, y, w, h, style) {
    const id = this.id();
    this.cells.push({ kind: "v", id, html, x, y, w, h, style, parent: "1" });
    return id;
  }
  edge(source, target, value = "", style = S.flow, o = {}) {
    const id = this.id();
    this.cells.push({ kind: "e", id, value, source, target, style, ...o });
    return id;
  }
  // An edge between two points that is not attached to shapes (sequence messages, frame lines).
  line(x1, y1, x2, y2, value = "", style = "", points = []) {
    const id = this.id();
    this.cells.push({ kind: "e", id, value, style, sourcePoint: [x1, y1], targetPoint: [x2, y2], points });
    return id;
  }
  xml() {
    const out = ['<mxGraphModel dx="1200" dy="800" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0">', "<root>", '<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
    for (const c of this.cells) {
      const value = c.html !== undefined ? esc(c.html) : esc(label(c.value));
      if (c.kind === "v") {
        out.push(`<mxCell id="${c.id}" value="${value}" style="${esc(c.style)}" vertex="1" parent="${c.parent}"><mxGeometry x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" as="geometry"/></mxCell>`);
      } else {
        const ends = `${c.source ? ` source="${c.source}"` : ""}${c.target ? ` target="${c.target}"` : ""}`;
        const pts = (c.points ?? []).length ? `<Array as="points">${c.points.map(([x, y]) => `<mxPoint x="${x}" y="${y}"/>`).join("")}</Array>` : "";
        const sp = c.sourcePoint ? `<mxPoint x="${c.sourcePoint[0]}" y="${c.sourcePoint[1]}" as="sourcePoint"/>` : "";
        const tp = c.targetPoint ? `<mxPoint x="${c.targetPoint[0]}" y="${c.targetPoint[1]}" as="targetPoint"/>` : "";
        out.push(`<mxCell id="${c.id}" value="${value}" style="${esc(c.style)}" edge="1" parent="1"${ends}><mxGeometry ${c.labelX !== undefined ? `x="${c.labelX}" ` : ""}relative="1" as="geometry">${sp}${tp}${pts}</mxGeometry></mxCell>`);
      }
    }
    out.push("</root>", "</mxGraphModel>");
    return `<mxfile host="FreshNest report">\n<diagram id="${esc(this.name)}" name="${esc(this.name)}">\n${out.join("\n")}\n</diagram>\n</mxfile>\n`;
  }
}

// ---------- sequence diagrams ----------
// participants: [{ key, label, actor }]; steps: { from, to, text, reply } | { self, text } | { alt: [{ guard, steps }] } | { opt: guard, steps }
export function sequence(name, participants, steps, { gap = 175, left = 70 } = {}) {
  const d = new Diagram(name);
  const xs = Object.fromEntries(participants.map((p, i) => [p.key, left + i * gap]));
  const order = Object.fromEntries(participants.map((p, i) => [p.key, i]));
  let y = 125;
  const frames = [];
  const keysIn = (list) => list.flatMap((s) => (s.alt ? s.alt.flatMap((b) => keysIn(b.steps)) : s.opt ? keysIn(s.steps) : s.self ? [s.self] : [s.from, s.to]));
  const run = (list) => {
    for (const s of list) {
      if (s.alt || s.opt) {
        const branches = s.alt ?? [{ guard: s.opt, steps: s.steps }];
        const keys = keysIn(branches.flatMap((b) => b.steps));
        const lo = Math.min(...keys.map((k) => order[k])), hi = Math.max(...keys.map((k) => order[k]));
        const fx = xs[participants[lo].key] - 70, fw = xs[participants[hi].key] - xs[participants[lo].key] + 140 + (branches.some((b) => b.steps.some((t) => t.self && order[t.self] === hi)) ? 70 : 0);
        const top = y;
        y += 26;
        const seps = [];
        branches.forEach((b, i) => {
          if (i > 0) { seps.push(y); y += 10; }
          d.vertex(`[${b.guard}]`, fx + (i === 0 ? 56 : 6), (i === 0 ? top + 2 : y - 4), 220, 18, "text;html=1;fontSize=11;align=left;verticalAlign=middle;");
          y += 18;
          run(b.steps);
        });
        y += 6;
        frames.push({ fx, top, fw, h: y - top, label: s.alt ? "alt" : "opt", seps });
        y += 30;
      } else if (s.self) {
        const x = xs[s.self];
        d.line(x, y, x, y + 22, s.text, "html=1;align=left;spacingLeft=6;verticalAlign=middle;endArrow=block;endFill=1;rounded=0;fontSize=11;labelPosition=right;", [[x + 30, y], [x + 30, y + 22]]);
        y += 42;
      } else {
        const x1 = xs[s.from], x2 = xs[s.to];
        d.line(x1, y, x2, y, s.text, s.reply
          ? "html=1;verticalAlign=bottom;endArrow=open;dashed=1;endFill=0;fontSize=11;"
          : "html=1;verticalAlign=bottom;endArrow=block;endFill=1;fontSize=11;");
        y += 34;
      }
    }
  };
  run(steps);
  const height = y + 10;
  // lifelines first so messages draw on top of them
  const lifelines = participants.map((p) => {
    const x = xs[p.key];
    const style = p.actor
      ? "shape=umlLifeline;participant=umlActor;perimeter=lifelinePerimeter;whiteSpace=nowrap;html=1;container=0;collapsible=0;recursiveResize=0;verticalAlign=top;spacingTop=42;outlineConnect=0;portConstraint=eastwest;size=45;fontSize=12;"
      : "shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;size=40;fontSize=12;";
    return { kind: "v", id: "l" + p.key, value: p.label, x: x - (p.actor ? 15 : 55), y: 20, w: p.actor ? 30 : 110, h: height - 20, style, parent: "1" };
  });
  const frameCells = [];
  for (const f of frames) {
    frameCells.push({ kind: "v", id: "f" + frameCells.length, value: f.label, x: f.fx, y: f.top, w: f.fw, h: f.h, style: "shape=umlFrame;whiteSpace=wrap;html=1;width=44;height=22;fontSize=11;fillColor=none;", parent: "1" });
    for (const sy of f.seps) frameCells.push({ kind: "e", id: "s" + frameCells.length, value: "", style: "endArrow=none;dashed=1;html=1;", sourcePoint: [f.fx, sy], targetPoint: [f.fx + f.fw, sy], points: [] });
  }
  d.cells = [...lifelines, ...frameCells, ...d.cells];
  return d;
}

// ---------- activity diagrams ----------
// Two swimlanes (role, FreshNest). Each step has its own row; the role's main path runs in column "m",
// retry and side steps in column "s" (left part of the role lane), system steps in column "y".
// nodes: { id: [kind, text, row, col] }; edges: [from, to, label?, ports?] with ports like "b-l" (exit bottom, enter left).
const PORT = { t: [0.5, 0], b: [0.5, 1], l: [0, 0.5], r: [1, 0.5] };
const ports = (p) => {
  if (!p) return "";
  const [e, n] = p.split("-");
  return `exitX=${PORT[e][0]};exitY=${PORT[e][1]};exitDx=0;exitDy=0;entryX=${PORT[n][0]};entryY=${PORT[n][1]};entryDx=0;entryDy=0;`;
};
export function flow(name, lanes, nodes, edges, { laneW = 400, rowH = 66, top = 52 } = {}) {
  const d = new Diagram(name);
  const rows = Math.max(...Object.values(nodes).map((n) => n[2]));
  const height = top + (rows + 1) * rowH + 6;
  lanes.forEach((l, i) => d.vertex(l, i * laneW, 0, laneW, height, S.lane));
  const X = { m: 262, s: 88, y: laneW + laneW / 2, y2: 2 * laneW + laneW / 2 };
  const ids = {};
  for (const [key, [kind, text, row, col]] of Object.entries(nodes)) {
    const [w, h] = kind === "start" || kind === "end" ? [26, 26] : kind === "decision" ? [140, 60] : col === "s" ? [150, 44] : [176, 44];
    const cx = typeof col === "number" ? col : X[col], cy = top + row * rowH + 22;
    ids[key] = d.vertex(kind === "start" || kind === "end" ? "" : text, cx - w / 2, cy - h / 2, w, h, S[kind]);
  }
  for (const [a, b, text = "", p = "", labelX] of edges) d.edge(ids[a], ids[b], text, S.flow + ports(p), labelX === undefined ? {} : { labelX });
  return d;
}
