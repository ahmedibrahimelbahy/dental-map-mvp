import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, "index.html");
const pdfPath = join(__dirname, "dental-map-design-asset-brief.pdf");

/* ── Step 1: inline any remaining assets/ <img> as base64 data URIs ─────
   Makes the page self-contained so a single HTML payload carries every
   image. Avoids subpath asset 403s from Vercel bot protection on
   subsequent image requests, and lets the brief survive being saved or
   shared as one file. */
const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
function dataUri(rel) {
  const abs = join(__dirname, rel);
  if (!existsSync(abs)) throw new Error("missing asset: " + rel);
  const mime = MIME[extname(rel).toLowerCase()] ?? "application/octet-stream";
  return `data:${mime};base64,${readFileSync(abs).toString("base64")}`;
}

const original = readFileSync(htmlPath, "utf-8");

// Inline <img src="assets/..."> as base64
const imgRefCount = (original.match(/src="assets\//g) || []).length;
let working = original.replace(
  /src="(assets\/[^"]+)"/g,
  (_, p) => `src="${dataUri(p)}"`
);

// Inject the logo as a CSS variable so .web-topbar, .cover .brand-row,
// and the .print-header pseudo-element all reference one inlined copy.
// Re-injectable: replaces any existing :root --logo-bg block.
const logoUri = dataUri("assets/logo.jpg");
const logoVarBlock = `<style id="brand-vars">:root{--logo-bg:url('${logoUri}');}</style>`;
const reLogoVar = /<style id="brand-vars">[\s\S]*?<\/style>/;
if (reLogoVar.test(working)) {
  working = working.replace(reLogoVar, logoVarBlock);
} else {
  working = working.replace("</head>", logoVarBlock + "\n</head>");
}

if (imgRefCount > 0 || !reLogoVar.test(original)) {
  writeFileSync(htmlPath, working);
  console.log(
    `Inlined ${imgRefCount} <img src> refs + 1 CSS --logo-bg variable.`
  );
  console.log(
    `HTML size: ${(original.length / 1024).toFixed(1)} KB → ${(
      working.length / 1024
    ).toFixed(1)} KB`
  );
} else {
  console.log("Already self-contained — refreshing logo var only.");
  writeFileSync(htmlPath, working);
}

/* ── Step 2: render the (now self-contained) HTML to PDF ─────────────── */
const browser = await chromium.launch();
const page = await browser.newPage();

const url = "file:///" + htmlPath.replace(/\\/g, "/");
console.log("Loading:", url);

await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);

await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();
console.log("PDF written:", pdfPath);
