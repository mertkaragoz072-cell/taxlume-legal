/* UI regression sweep for the web build.
 *
 *   npx expo start --web --port 19006     (in another terminal)
 *   npm run qa:ui                         (needs: npm i -D playwright)
 *
 * Opens every tab in Turkish and English at 390 and 340 px wide, scrolls each
 * one top to bottom, and fails if anything pokes past the screen edge, text
 * is cut off inside its box, or the browser console reports an error. It also
 * writes a screenshot of each stop to ./qa-output so changes can be eyeballed
 * or diffed. The save it starts from is scripts/fixtures/ui-qa-save.json. */
/* global document, innerWidth, getComputedStyle,*/
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const APP_URL = process.env.QA_URL || "http://localhost:19006/";
const KEY = "taxlume-town-economy-save-v1";
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "ui-qa-save.json"), "utf8"));
const base = JSON.parse(fixture[KEY]).state;
const OUT = path.join(__dirname, "..", "qa-output");
fs.mkdirSync(OUT, { recursive: true });

const LANGS = {
  tr: {
    tabs: ["Piyasa", "Envanter", "Ticaret", "Kasaba", "Araştırma", "Yatırım", "Hedefler"],
    cont: /^DEVAM ET$/,
    spin: /Çarkı Çevir/,
    ok: /^Harika!?$/,
  },
  en: {
    tabs: ["Market", "Inventory", "Trade", "Town", "Research", "Invest", "Goals"],
    cont: /^CONTINUE$/,
    spin: /Spin the Wheel/,
    ok: /^Awesome!?$/,
  },
};
// Rows that scroll sideways on purpose are skipped by the edge check.
const IGNORE_CONSOLE = /navigator\.vibrate/;

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const problems = [];
  for (const [lang, L] of Object.entries(LANGS)) {
    for (const W of [390, 340]) {
      const st = JSON.parse(JSON.stringify(base));
      Object.assign(st, {
        language: lang,
        lastSavedAt: Date.now(),
        mentorStep: 99,
        onboardingStep: 99,
        cash: 2500,
        tradeUnlocked: true,
        firstCaravanSent: true,
        metropolUnlocked: true,
        doctrine: "merchant",
        merveRankUp: null,
        pendingDecision: null,
        pendingRequest: null,
        pendingRivalOffer: null,
        offlineSummary: null,
        dailyBonusPending: null,
      });
      const ctx = await browser.newContext({
        viewport: { width: W, height: W === 390 ? 844 : 740 },
        locale: lang === "tr" ? "tr-TR" : "en-US",
      });
      const page = await ctx.newPage();
      page.on("console", (m) => {
        if (m.type() === "error" && !IGNORE_CONSOLE.test(m.text()))
          problems.push(`${lang}${W} console: ${m.text().slice(0, 120)}`);
      });
      page.on("pageerror", (e) => problems.push(`${lang}${W} pageerror: ${String(e).slice(0, 120)}`));
      await page.addInitScript(
        ([k, v]) => {
          if (!sessionStorage.getItem("seeded")) {
            localStorage.setItem(k, v);
            sessionStorage.setItem("seeded", "1");
          }
        },
        [KEY, JSON.stringify({ version: 58, state: st })]
      );
      await page.goto(APP_URL + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(3500);
      const cont = page.getByText(L.cont).first();
      if (await cont.count()) await cont.click();
      await page.waitForTimeout(2500);
      const wheel = page.getByText(L.spin).first();
      if (await wheel.count()) {
        await wheel.click();
        await page.waitForTimeout(5500);
        const ok = page.getByText(L.ok).first();
        if (await ok.count()) await ok.click();
        await page.waitForTimeout(1500);
      }
      for (const tab of L.tabs) {
        await page
          .getByText(new RegExp("^" + tab + "$"))
          .last()
          .click({ force: true });
        await page.waitForTimeout(1300);
        for (let i = 0; i < 8; i++) {
          const r = await page.evaluate(() => {
            const vw = innerWidth;
            const edge = [];
            const cut = [];
            document.querySelectorAll("div,span,img").forEach((e) => {
              const b = e.getBoundingClientRect();
              if (b.width > 0 && b.right > vw + 4 && b.left < vw - 4) {
                let p = e.parentElement,
                  clipped = false;
                while (p && p !== document.body) {
                  const cs = getComputedStyle(p);
                  if (cs.overflowX !== "visible" && p.getBoundingClientRect().right <= vw + 1) {
                    clipped = true;
                    break;
                  }
                  p = p.parentElement;
                }
                if (!clipped) edge.push((e.innerText || e.tagName || "").slice(0, 30).replace(/\n/g, " "));
              }
            });
            document.querySelectorAll("div").forEach((e) => {
              if (
                !e.childElementCount &&
                e.innerText &&
                e.innerText.trim().length > 6 &&
                (e.scrollWidth > e.clientWidth + 3 || e.scrollHeight > e.clientHeight + 3)
              ) {
                const cs = getComputedStyle(e);
                if (cs.overflow !== "visible" || cs.textOverflow === "ellipsis")
                  cut.push(e.innerText.slice(0, 30).replace(/\n/g, " "));
              }
            });
            return { edge: edge.slice(0, 3), cut: cut.slice(0, 3) };
          });
          if (r.edge.length) problems.push(`${lang}${W} ${tab}: past edge: ${r.edge.join(" | ")}`);
          if (r.cut.length) problems.push(`${lang}${W} ${tab}: cut text: ${r.cut.join(" | ")}`);
          if (i % 3 === 0) await page.screenshot({ path: path.join(OUT, `${lang}${W}_${tab}_${i}.png`) });
          await page.mouse.move(W / 2, 400);
          await page.mouse.wheel(0, 550);
          await page.waitForTimeout(250);
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
  const uniq = [...new Set(problems)];
  if (uniq.length) {
    console.error("UI QA found problems:\n" + uniq.join("\n"));
    process.exit(1);
  }
  console.log("UI QA passed: no overflow, no cut-off text, no console errors. Screenshots in qa-output/");
})();
