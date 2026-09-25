// Release smoke test: walk every screen in both languages, on a fresh install
// and on a restored save, and fail on a console error or an unreachable tab.
//
//   npx expo start --web --port 8251
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/smoke-test.js
//
// Exits non-zero on the first thing that would stop a player, which is what
// makes it usable as a gate before a build goes out. The unit tests cover the
// reducer; this covers the part no unit test can — that a person who has
// never opened the app before can get from the title screen to a screen.
//
// A fresh install opens in the device's language: Turkish when the device
// asks for Turkish, English otherwise. So each scenario runs in a browser
// context with the matching locale and expects to land in that language,
// which is the behaviour itself under test — expo-localization reads
// navigator.languages on web, and Playwright's `locale` sets it.
const { chromium } = require("playwright");
const { CHROMIUM, SAVE_KEY, TUTORIAL_KEY, SAVE_VERSION, seed } = require("./lib/seed-town");

const PORT = process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : "8251";
const APP_URL = `http://127.0.0.1:${PORT}`;

const TABS = {
  tr: ["Piyasa", "Envanter", "Ticaret", "Kasaba", "Araştırma", "Yatırım", "Hedefler"],
  en: ["Market", "Inventory", "Trade", "Town", "Research", "Invest", "Goals"],
};
const START = { tr: /^(BAŞLA|DEVAM ET)$/, en: /^(START|CONTINUE)$/ };
// Merve's walk-through, which is what a first launch opens with now — the
// slide deck only ever appears behind the ❓ button. Her name is the check
// that she actually arrived; the skip control is how the walk gets past her.
const MENTOR = { tr: "Merve", en: "Merve" };
const SKIP = { tr: "Geç", en: "Skip" };
// A fresh install opens the daily-reward wheel right behind the tutorial —
// by design, the check-in fires on hydrate. A new player has to spin it and
// claim before the tab bar is reachable, so the smoke test does too: if
// either step were broken, nobody could ever reach a screen.
const SPIN = { tr: "🎡 Çarkı Çevir", en: "🎡 Spin the Wheel" };
const CLAIM = { tr: "Harika!", en: "Awesome!" };
const PAUSE = { tr: "Oyunu duraklat", en: "Pause game" };

// Chrome refuses navigator.vibrate until the frame has a trusted gesture and
// logs it itself. The app already swallows the rejection; the line comes from
// the browser, it is web-only, and a synthetic click does not satisfy it.
const IGNORABLE = [/navigator\.vibrate/i];

// Generous on purpose. The first context of a run hits a cold Metro server
// and everything after it is warm, so a tight ceiling fails the first
// scenario and passes the rest — which reads as an intermittent app bug and
// is not one. Waiting for the element to actually be visible before asking
// Playwright to click it removes the other half of that noise.
const CLICK = { timeout: 25000 };

async function tap(locator, what) {
  try {
    await locator.first().waitFor({ state: "visible", timeout: CLICK.timeout });
    await locator.first().click(CLICK);
  } catch (e) {
    // Name the control, and name whatever is sitting on top of it. "locator
    // .click: Timeout" on its own sends you reading a Playwright trace to
    // find out which of five taps it was, and never says what blocked it.
    let over = "(unknown)";
    try {
      const box = await locator.first().boundingBox();
      if (box) {
        /* eslint-disable no-undef -- serialised into the page */
        over = await locator.page().evaluate(
          ([x, y]) => {
            let node = document.elementFromPoint(x, y);
            for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
              const text = (node.innerText || "").trim();
              if (text) return text.slice(0, 90).replace(/\n/g, " | ");
            }
            return "(nothing with text)";
          },
          [box.x + box.width / 2, box.y + box.height / 2]
        );
        /* eslint-enable no-undef */
      }
    } catch {
      /* the diagnostic must never be the thing that fails */
    }
    throw new Error(`tapping "${what}" — on top of it: ${over}`, { cause: e });
  }
}

/** Answer whatever interrupting modal the clock has thrown up, if one is
 * covering the pause control.
 *
 * A decision, a villager's request and a rival's offer can each fire from the
 * first tick, and every one of them waits for an answer — that is the design,
 * not a bug. A player who meets one answers it and carries on; so does this.
 *
 * It does not match on text. The decision modal's options are written per
 * template, so there is no label to look for, and the three modals share no
 * wording. Instead it takes the last button that is genuinely on top —
 * anything behind the backdrop fails the hit test — which in all three is the
 * option that costs the player nothing: refuse, decline, or the last branch.
 *
 * Returns false when the pause control is already reachable, so it can never
 * wander off and press something on a screen with no modal over it.
 */
async function answerEventModal(page, pauseLabel) {
  /* eslint-disable no-undef -- serialised into the page */
  const found = await page.evaluate((label) => {
    const hitTakenBy = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return null;
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    };

    const pause = document.querySelector(`[aria-label="${label}"]`);
    if (pause) {
      const hit = hitTakenBy(pause);
      if (hit && pause.contains(hit)) return false;
    }

    const onTop = [...document.querySelectorAll('[role="button"]')].filter((el) => {
      const hit = hitTakenBy(el);
      return Boolean(hit) && el.contains(hit);
    });
    const target = onTop[onTop.length - 1];
    if (!target) return false;
    target.setAttribute("data-smoke-answer", "1");
    return true;
  }, pauseLabel);
  /* eslint-enable no-undef */

  if (!found) return false;

  const target = page.locator("[data-smoke-answer]").first();
  await target.click({ timeout: 8000 }).catch(() => {});
  /* eslint-disable no-undef -- serialised into the page */
  await page.evaluate(() =>
    document.querySelectorAll("[data-smoke-answer]").forEach((el) => el.removeAttribute("data-smoke-answer"))
  );
  /* eslint-enable no-undef */
  return true;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const problems = [];

  const probe = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await probe.goto(APP_URL, { waitUntil: "networkidle" });
  await probe.waitForFunction((k) => localStorage.getItem(k) !== null, SAVE_KEY, { timeout: 90000 });
  const base = JSON.parse(await probe.evaluate((k) => localStorage.getItem(k), SAVE_KEY));
  await probe.close();

  for (const lang of ["tr", "en"]) {
    for (const mode of ["fresh", "saved"]) {
      const label = `${lang}/${mode}`;
      const ctx = await browser.newContext({
        viewport: { width: 430, height: 932 },
        locale: lang === "tr" ? "tr-TR" : "en-US",
      });
      const errors = [];
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
      page.on("console", (m) => {
        if (m.type() === "error" && !IGNORABLE.some((r) => r.test(m.text()))) errors.push(m.text());
      });

      if (mode === "saved") {
        const state = seed(base.state);
        state.language = lang;
        state.paused = false;
        state.lastSavedAt = Date.now();
        await page.addInitScript(
          ([sk, tk, v, st]) => {
            localStorage.setItem(sk, JSON.stringify({ version: v, state: st }));
            localStorage.setItem(tk, "1");
          },
          [SAVE_KEY, TUTORIAL_KEY, SAVE_VERSION, state]
        );
      }

      await page.goto(APP_URL, { waitUntil: "networkidle" });
      await page.waitForTimeout(4500);

      let tabFails = 0;
      let wheelShown;
      // The clock keeps running while the walk happens, and the game's event
      // modals — a rival trader's offer, a villager's request, a decision —
      // are *meant* to interrupt and wait for an answer. Left running, this
      // test fails intermittently on whichever modal happened to fire, which
      // says nothing about whether the screens work. Pausing first makes the
      // walk deterministic, and exercises the pause control on the way.
      try {
        // No language toggle here any more. The context's locale decides what
        // a fresh install opens in, and tapping the start button by its
        // localised label is what proves it landed in the right one.
        await tap(page.getByText(START[lang], { exact: true }), "start button");
        await page.waitForTimeout(2000);

        // A fresh install is met by the mentor, docked above the tab bar.
        // She is the whole first-run explanation, so if she fails to appear
        // a new player is dropped into the game with nothing.
        const mentor = page.getByText(MENTOR[lang], { exact: false });
        const skip = page.locator('[role="button"]').filter({ hasText: SKIP[lang] });
        if (mode === "fresh" && !(await mentor.count())) {
          problems.push(`${label}: the mentor did not appear on a fresh install`);
        }
        if (mode === "saved" && (await mentor.count())) {
          problems.push(`${label}: the mentor reappeared for a returning player`);
        }
        if (await skip.count()) {
          await tap(skip, "mentor skip");
          await page.waitForTimeout(1200);
        }

        // The wheel is a "you came back" reward, so a first launch must not
        // show it: a brand new player would meet the tutorial, then a wheel,
        // then a claim button, before ever seeing the market. A restored save
        // is a return visit and does get one.
        const spin = page.getByText(SPIN[lang], { exact: true });
        wheelShown = (await spin.count()) > 0;
        if (mode === "fresh" && wheelShown) {
          problems.push(`${label}: the daily wheel opened on a first launch`);
        }
        if (mode === "saved" && !wheelShown) {
          problems.push(`${label}: the daily wheel did not open for a returning player`);
        }
        if (wheelShown) {
          await tap(spin, "wheel spin");
          const claim = page.getByText(CLAIM[lang], { exact: true });
          // The wheel spins before it reveals, so wait for the reveal rather
          // than guessing how long the animation takes.
          await claim
            .first()
            .waitFor({ state: "visible", timeout: CLICK.timeout })
            .catch(() => {});
          if (!(await claim.count())) {
            problems.push(`${label}: the wheel spun but never offered its claim button`);
          } else {
            await tap(claim, "wheel claim");
            await page.waitForTimeout(1200);
          }
        }
      } catch (e) {
        problems.push(`${label}: could not get past the title/mentor — ${e.message.split("\n")[0]}`);
        await ctx.close();
        continue;
      }

      // Clear the way to the pause control first. Three passes, because
      // answering one modal can reveal the next; each returns false the
      // moment nothing is covering it.
      for (let pass = 0; pass < 3; pass++) {
        if (!(await answerEventModal(page, PAUSE[lang]))) break;
        await page.waitForTimeout(900);
      }

      try {
        await tap(page.locator(`[aria-label="${PAUSE[lang]}"]`), "pause");
        await page.waitForTimeout(600);
      } catch (e) {
        problems.push(`${label}: the pause control was not reachable — ${e.message.split("\n")[0]}`);
      }

      for (const tab of TABS[lang]) {
        try {
          await tap(page.locator(`[aria-label="${tab}"]`), tab);
          await page.waitForTimeout(1000);
        } catch {
          // "intercepts pointer events" 30 lines into a Playwright trace does
          // not say what is in the way. Walk up from the point the tab bar
          // occupies and report the first ancestor with text: that names the
          // overlay, which is usually a modal the game meant to show.
          /* eslint-disable no-undef -- this callback is serialised and run in the page, not in Node */
          const blocker = await page.evaluate(() => {
            let node = document.elementFromPoint(60, window.innerHeight - 30);
            for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
              const text = (node.innerText || "").trim();
              if (text) return text.slice(0, 90).replace(/\n/g, " | ");
            }
            return "(nothing with text)";
          });
          /* eslint-enable no-undef */
          problems.push(`${label}: tab "${tab}" unreachable — blocked by: ${blocker}`);
          tabFails++;
        }
      }

      if (errors.length) {
        problems.push(`${label}: ${errors.length} console error(s): ${errors[0].slice(0, 140)}`);
      }
      if (!tabFails && !errors.length) {
        const steps = [
          "title",
          mode === "fresh" ? "mentor" : "no mentor",
          wheelShown ? "wheel" : "no wheel",
          "pause",
        ];
        console.log(`✅ ${label}: ${steps.join(", ")}, all ${TABS[lang].length} screens, clean`);
      }
      await ctx.close();
    }
  }

  await browser.close();
  if (problems.length) {
    console.log("\n🔴 PROBLEMS:");
    problems.forEach((p) => console.log("  " + p));
    process.exit(1);
  }
  console.log("\n🟢 SMOKE TEST PASSED");
})();
