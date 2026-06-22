import puppeteer from "puppeteer-core";

const CHROME =
  "/Users/pradiptajana/.cache/puppeteer/chrome/mac_arm-149.0.7827.22/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";

// device matrix: [label, width, height, isMobile/touch]
const DEVICES = [
  ["320", 320, 720, true],
  ["375", 375, 812, true],
  ["414", 414, 896, true],
  ["768", 768, 1024, true], // tablet portrait
  ["1024", 1024, 768, false],
  ["1280", 1280, 800, false],
  ["1440", 1440, 900, false],
  ["1920", 1920, 1080, false],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

for (const [label, width, height, touch] of DEVICES) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 1,
    isMobile: touch,
    hasTouch: touch,
  });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));

  await page.goto("http://localhost:3000/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 6000)); // through loader

  // scroll to ~40% so a content scene is framed (about/bitpastel)
  const max = await page.evaluate(
    () => document.body.scrollHeight - window.innerHeight
  );
  await page.evaluate(
    (y) => {
      const l = window.__lenis;
      if (l) l.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    },
    max * 0.4
  );
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `scripts/resp-${label}.png` });

  const info = await page.evaluate(() => {
    const sf = document.querySelector(".stage-frame");
    return {
      isFlow: sf?.classList.contains("is-flow"),
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      canvas: !!document.querySelector("canvas"),
    };
  });
  const overflow = info.docW > info.winW + 1;
  console.log(
    `${label.padStart(4)}  cinematic=${(!info.isFlow).toString().padEnd(5)}  ` +
      `overflowX=${overflow.toString().padEnd(5)} (doc ${info.docW} / win ${info.winW})  ` +
      `canvas=${info.canvas}  err=${errs.slice(0, 2).join("|") || "none"}`
  );
  await page.close();
}

await browser.close();
