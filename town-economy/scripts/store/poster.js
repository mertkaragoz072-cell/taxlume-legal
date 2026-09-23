/* Copy and layout for the poster-style store screenshots. Browser code:
 * loaded by poster.html, which the renderer opens per language and shot. */

const q = new URLSearchParams(location.search);
const LANG = q.get("lang") === "en" ? "en" : "tr";
const FILE = q.get("shot");
const HERO = q.get("hero") === "1";
const CTA = q.get("cta") !== "0";

const COPY = {
  tr: {
    foot: "— STRATEJİ · TİCARET · ZENGİNLİK —",
    cta: "HEMEN İNDİR",
    shots: {
      "01-market": ["Kendi Kasabanı Kur,\nEkonomini Yönet!", "Üret, al-sat, yatırım yap, kasabanı büyüt!"],
      "02-trade-map": ["Kervanlarını\nYola Çıkar!", "Sekiz kasaba, sekiz ayrı piyasa"],
      "03-town": ["Halkını\nMemnun Tut!", "Vergi, mutluluk ve büyüme arasındaki denge"],
      "04-research": ["Üretimini\nGeliştir!", "On altı araştırma, kalıcı verim"],
      "05-invest": ["Altına ve Petrole\nYatırım Yap!", "Servetini enflasyona karşı koru"],
      "06-goals": ["Yirmi Altı\nBaşarım!", "Her gün gir, seriyi büyüt"],
      "07-inventory": ["Stoğunu Yönet,\nKârını Gör!", "Ne zaman satacağına sen karar ver"],
      "08-doctrine": ["Kasabanın\nYolunu Seç!", "Üç doktrin, üç ayrı oyun"],
    },
  },
  en: {
    foot: "— STRATEGY · TRADE · FORTUNE —",
    cta: "PLAY NOW",
    shots: {
      "01-market": ["Build Your Town,\nRun Its Economy!", "Produce, trade, invest, grow your town!"],
      "02-trade-map": ["Send Your\nCaravans Out!", "Eight towns, eight separate markets"],
      "03-town": ["Keep Your\nTownsfolk Happy!", "The balance of tax, happiness and growth"],
      "04-research": ["Upgrade Your\nProduction!", "Sixteen upgrades, permanent gains"],
      "05-invest": ["Invest in Gold\nand Oil!", "Hedge your fortune against inflation"],
      "06-goals": ["Twenty-Six\nAchievements!", "Come back daily, grow the streak"],
      "07-inventory": ["Manage Stock,\nTrack Your Profit!", "You decide when to sell"],
      "08-doctrine": ["Choose Your\nTown's Path!", "Three doctrines, three different games"],
    },
  },
}[LANG];

const [head, sub] = COPY.shots[FILE];
document.getElementById("head").innerHTML = head.replace("\n", "<br/>");
document.getElementById("sub").textContent = sub;
document.getElementById("logo").src = `../../assets/logo/logo-stacked-${LANG}-900.png`;
document.getElementById("shot").src = `../../store-assets/screenshots/${LANG}/${FILE}.png`;
document.getElementById("foot").textContent = COPY.foot;

const cta = document.getElementById("cta");
// The call to action belongs on the lead image only. Repeated across all
// eight it reads as a banner ad, and on the App Store every copy is another
// chance for a reviewer to object — Apple's guidance is that a screenshot
// shows the app, while a download button is a Google Play convention.
if (CTA && HERO) cta.textContent = COPY.cta;
else cta.remove();

// The merchant is the hero card's character; on the other seven he would
// cover the phone and say nothing new, so he only appears where he earns it.
if (!HERO) document.getElementById("merchant").remove();

// The painted background is the game's own town, drawn wide and blurred.
(function town() {
  const houses = [];
  let seed = 0x1f2e3d;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 26; i++) houses.push([90 + rnd() * 120, 180 + rnd() * 330]);
  const floor = 900;
  let x = 10;
  let d = "";
  for (const [w, h] of houses) {
    const top = floor - h;
    const pitch = Math.round(w * 0.46);
    d += `<path d="M${x} ${top} h${w} v${h} h-${w} Z" fill="url(#wall)"/>`;
    d += `<path d="M${x - 16} ${top} L${x + w / 2} ${top - pitch} L${x + w + 16} ${top} Z" fill="url(#roof)"/>`;
    for (let r = 0; r < 2; r++) {
      const wy = top + 60 + r * 110;
      if (wy + 70 < floor) {
        d += `<rect x="${x + w / 2 - 52}" y="${wy}" width="42" height="60" rx="8" fill="#f6e2b4" opacity=".85"/>`;
        d += `<rect x="${x + w / 2 + 12}" y="${wy}" width="42" height="60" rx="8" fill="#f6e2b4" opacity=".85"/>`;
      }
    }
    x += w + 8;
  }
  document.getElementById("town").innerHTML = `<defs>
       <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#f3e2bd"/><stop offset="1" stop-color="#b08f5f"/></linearGradient>
       <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#d9714a"/><stop offset="1" stop-color="#9c4526"/></linearGradient>
     </defs>${d}`;
})();

// A handful of coins along the bottom edge, in fixed positions so the render
// is reproducible.
for (const [cx, cy, r] of [
  [26, 2318, 40],
  [18, 2508, 26],
  [1218, 2356, 36],
  [1206, 2540, 22],
  [1232, 2170, 16],
]) {
  const el = document.createElement("div");
  el.className = "coin";
  el.style.cssText = `left:${cx}px;top:${cy}px;width:${r * 2}px;height:${r * 2}px`;
  document.getElementById("c").appendChild(el);
}
