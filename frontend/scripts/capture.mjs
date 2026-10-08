import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const stamp = new Date()
  .toISOString()
  .replaceAll(":", "-")
  .replaceAll(".", "-");
const directory = path.resolve("../.impeccable/review", stamp);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const errors = [];
const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
desktop.on("pageerror", (e) => errors.push(e.message));
await desktop.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
await desktop.getByText("Service connecté", { exact: true }).waitFor();
await desktop.evaluate(() => document.fonts.ready);
await desktop.screenshot({
  path: path.join(directory, "desktop.png"),
  fullPage: true,
});
for (const route of ["historique", "modeles", "guide"]) {
  await desktop.goto(`http://127.0.0.1:5173/#${route}`, {
    waitUntil: "networkidle",
  });
  await desktop.screenshot({
    path: path.join(directory, `${route}.png`),
    fullPage: true,
  });
}
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
await mobile.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
await mobile.evaluate(() => document.fonts.ready);
await mobile.screenshot({
  path: path.join(directory, "mobile.png"),
  fullPage: true,
});
await desktop.goto("http://127.0.0.1:5173/#analyse", {
  waitUntil: "networkidle",
});
await desktop.getByRole("combobox", { name: "Modèle de détection" }).click();
await desktop.screenshot({
  path: path.join(directory, "model-dropdown.png"),
  fullPage: true,
});
await desktop.keyboard.press("Escape");
for (const width of [768, 1024]) {
  const tablet = await browser.newPage({ viewport: { width, height: 1000 } });
  await tablet.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  await tablet.screenshot({
    path: path.join(directory, `tablet-${width}.png`),
    fullPage: true,
  });
  await tablet.close();
}
for (const route of ["historique", "modeles", "guide"]) {
  await mobile.goto(`http://127.0.0.1:5173/#${route}`, {
    waitUntil: "networkidle",
  });
  await mobile.screenshot({
    path: path.join(directory, `mobile-${route}.png`),
    fullPage: true,
  });
}
const overflow = await mobile.evaluate(() => ({
  viewport: innerWidth,
  document: document.documentElement.scrollWidth,
  body: document.body.scrollWidth,
}));
await desktop.goto("http://127.0.0.1:5173/#analyse");
await desktop
  .getByRole("button", { name: "Essayer avec l’image d’exemple", exact: false })
  .click();
await desktop
  .getByText("terrain-cotonou.jpg", { exact: true })
  .first()
  .waitFor();
await desktop.screenshot({
  path: path.join(directory, "file-preview.png"),
  fullPage: true,
});
await writeFile(
  path.join(directory, "checks.json"),
  JSON.stringify(
    {
      errors,
      overflow,
      captured: [
        "desktop",
        "mobile",
        "historique",
        "modeles",
        "guide",
        "file-preview",
      ],
    },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log(JSON.stringify({ directory, errors, overflow }));
await browser.close();
