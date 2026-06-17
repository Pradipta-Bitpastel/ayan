import puppeteer from "puppeteer-core";

const CHROME =
  "/Users/pradiptajana/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist","--enable-unsafe-swiftshader"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console.error: " + m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 30000 });

// Wait through the loader (floor ~2.2s + rack), plus swiftshader slack
await new Promise((r) => setTimeout(r, 9000));
await page.screenshot({ path: "scripts/shot-hero.png" });

// Scroll through the pinned story in steps.
const steps = [0.2, 0.38, 0.6, 0.9];
const maxScroll = await page.evaluate(
  () => document.body.scrollHeight - window.innerHeight
);
for (let i = 0; i < steps.length; i++) {
  await page.evaluate((y) => { const l=window.__lenis; if(l) l.scrollTo(y,{immediate:true}); else window.scrollTo(0,y); }, maxScroll * steps[i]);
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `scripts/shot-${i + 1}.png` });
}

// Report the visible name + a couple scene checks.
const info = await page.evaluate(() => {
  const name = document.querySelector("#ayan-name h1")?.textContent;
  const scenes = [...document.querySelectorAll(".scene")].map((s) => ({
    id: s.id,
    opacity: getComputedStyle(s).opacity,
  }));
  const canvas = !!document.querySelector("canvas");
  return { name, scenes, canvas };
});

console.log("NAME:", info.name);
console.log("CANVAS:", info.canvas);
console.log("SCENES:", JSON.stringify(info.scenes));
console.log("ERRORS:", errors.length ? errors.slice(0, 12).join("\n") : "none");

await browser.close();
