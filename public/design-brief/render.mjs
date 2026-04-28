import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, "index.html");
const pdfPath = join(__dirname, "dental-map-design-asset-brief.pdf");

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
