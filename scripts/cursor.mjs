import puppeteer from "puppeteer-core";
const CHROME = "/Users/pradiptajana/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const b = await puppeteer.launch({ executablePath: CHROME, headless:"new", args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"], defaultViewport:{width:1440,height:900}});
const p = await b.newPage();
await p.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"no-preference"}]);
const errs=[]; p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});
await new Promise(r=>setTimeout(r,9000));
// move the cursor across the name (over the middle letters)
await p.mouse.move(620, 380, {steps:12});
await new Promise(r=>setTimeout(r,500));
await p.screenshot({ path:"scripts/cursor-1.png" });
await p.mouse.move(900, 400, {steps:12});
await new Promise(r=>setTimeout(r,500));
await p.screenshot({ path:"scripts/cursor-2.png" });
console.log("ERRORS:", errs.length?errs.join("\n"):"none");
await b.close();
