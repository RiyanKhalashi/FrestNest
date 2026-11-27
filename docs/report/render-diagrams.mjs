// Turns every diagrams/*.drawio file into a PNG next to it, using draw.io's own renderer
// from the VS Code draw.io extension (no internet needed) and Google Chrome.
// Run after editing a diagram in VS Code:  npm run diagrams   (then npm run build)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(ROOT, "diagrams");
const only = process.argv.slice(2);

const extDir = path.join(os.homedir(), ".vscode", "extensions");
const ext = fs.readdirSync(extDir).filter((f) => f.startsWith("hediet.vscode-drawio-")).sort().pop();
if (!ext) throw new Error("The draw.io extension for VS Code (hediet.vscode-drawio) is not installed.");
const webapp = path.join(extDir, ext, "drawio", "src", "main", "webapp");

const page = path.join(os.tmpdir(), "freshnest-drawio-render.html");
fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8">
<script>window.mxLoadResources=false;window.isLocalStorage=false;window.mxBasePath="file://${webapp}/mxgraph";window.STENCIL_PATH="file://${webapp}/stencils";window.IMAGE_PATH="file://${webapp}/images";</script>
<script src="file://${webapp}/js/viewer-static.min.js"></script></head><body style="margin:0;background:#fff"><div id="d"></div></body></html>`);

// Wide diagrams are turned a quarter turn (like a landscape figure in a portrait report) so they fill the page.
const ROTATE = ["er-diagram"];

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".drawio") && (!only.length || only.some((o) => f.includes(o))));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--allow-file-access-from-files"] });
try {
  const tab = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 2400, height: 1600 } });
  for (const f of files) {
    await tab.goto("file://" + page);
    const xml = fs.readFileSync(path.join(DIR, f), "utf8");
    await tab.evaluate((xml) => {
      const div = document.getElementById("d");
      new GraphViewer(div, mxUtils.parseXml(xml).documentElement, { highlight: "none", nav: false, toolbar: null, lightbox: false, border: 12 });
    }, xml);
    await tab.waitForTimeout(300);
    const svg = await tab.$("#d svg");
    const out = path.join(DIR, f.replace(/\.drawio$/, ".png"));
    const shot = await svg.screenshot({ omitBackground: false });
    if (ROTATE.some((r) => f.startsWith(r))) {
      const turned = await tab.evaluate(async (b64) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.height; c.height = img.width;
        const g = c.getContext("2d");
        g.translate(0, c.height); g.rotate(-Math.PI / 2); g.drawImage(img, 0, 0);
        return c.toDataURL("image/png").split(",")[1];
      }, shot.toString("base64"));
      fs.writeFileSync(out, Buffer.from(turned, "base64"));
    } else fs.writeFileSync(out, shot);
    console.log("rendered", f);
  }
} finally {
  await browser.close();
}
