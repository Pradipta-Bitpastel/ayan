import puppeteer from "puppeteer-core";
const CHROME = "/Users/pradiptajana/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-webgl","--ignore-gpu-blocklist","--enable-unsafe-swiftshader"],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } });
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
const errors = [];
page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("pageerror: "+e.message));
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded", timeout: 30000 });
const names = ["a","b","c","d"];
for (let i=0;i<names.length;i++){
  await new Promise(r=>setTimeout(r, 1600));
  const r = await page.evaluate(()=>document.querySelector(".fixed.inset-0.z-50 span")?.textContent||"gone");
  console.log(names[i], r);
  await page.screenshot({ path: `scripts/loader-${names[i]}.png` });
}
console.log("ERRORS:", errors.length?errors.slice(0,8).join("\n"):"none");
await browser.close();
