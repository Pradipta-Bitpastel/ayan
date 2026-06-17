import puppeteer from "puppeteer-core";
const CHROME = "/Users/pradiptajana/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const b = await puppeteer.launch({ executablePath: CHROME, headless:"new", args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"], defaultViewport:{width:1440,height:900}});
const p = await b.newPage();
await p.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"no-preference"}]);
const errs=[]; p.on("pageerror",e=>errs.push(e.message)); p.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"});
await new Promise(r=>setTimeout(r,9000));
const max = await p.evaluate(()=>document.body.scrollHeight - innerHeight);
for (const [frac,name] of [[0.30,"about"],[0.46,"bit"],[0.60,"photo"],[0.62,"photo2"]]) {
  await p.evaluate((y)=>{const l=window.__lenis; if(l)l.scrollTo(y,{immediate:true}); else scrollTo(0,y);}, max*frac);
  await new Promise(r=>setTimeout(r,1600));
  await p.screenshot({ path:`scripts/g-${name}.png` });
}
console.log("ERRORS:", errs.length?errs.slice(0,8).join("\n"):"none");
await b.close();
