// 島嶼咖啡散策：資料與網頁檢查
//
// 用法（在儲存庫根目錄）：node tests/check.js
// 需要 Playwright 與 Chromium（雲端工作環境已預先安裝；本機可先執行 npm i -D playwright 與 npx playwright install chromium）。
//
// 檢查內容：
//   1. 資料：cafes.js 每筆欄位齊全、縣市在 CITY_ORDER 內、店名與「縣市＋地址」不重複、來源網址不重複、CHECKED_AT 格式正確
//   2. 版本：index.html 的 ?v= 與 sw.js 的 VERSION 一致；PRECACHE 裡的本機檔案都存在
//   3. 投影片：slides.js 的圖片都存在，作者、授權、來源都有填
//   4. 網頁（手機寬度）：卡片數量等於資料筆數、沒有橫向捲動、沒有 JavaScript 錯誤、篩選正常、Instagram 與路線連結、
//      Service Worker 控制頁面、離線重新整理仍看得到清單
// 全部通過時結束代碼為 0，否則為 1。

const fs = require("fs");
const path = require("path");
const http = require("http");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
let failed = 0;
const ok = (cond, msg) => {
  console.log((cond ? "PASS " : "FAIL ") + msg);
  if (!cond) failed++;
};
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const load = (f) => { const w = {}; vm.runInNewContext(read(f), { window: w }); return w; };

// ---------- 1. 資料 ----------
const data = load("cafes.js").CAFE_DATA;
const cafes = data.CAFES;
const FIELDS = ["name", "city", "district", "address", "hours", "closed", "note"];
const badFields = cafes.filter((c) =>
  FIELDS.some((k) => typeof c[k] !== "string") || !c.name || !c.city || !c.district || !c.address ||
  !Array.isArray(c.tags) || typeof c.verify !== "boolean");
ok(badFields.length === 0, `每筆資料欄位齊全（有問題：${badFields.map((c) => c.name).join("、") || "無"}）`);
const badCity = cafes.filter((c) => !data.CITY_ORDER.includes(c.city));
ok(badCity.length === 0, `縣市都在 CITY_ORDER 內（有問題：${badCity.map((c) => c.name + "/" + c.city).join("、") || "無"}）`);
ok(cafes.every((c) => c.address.startsWith(c.city)), "地址都以縣市開頭");
const dup = (arr) => [...new Set(arr.filter((x, i) => arr.indexOf(x) !== i))];
const dupNames = dup(cafes.map((c) => c.name));
ok(dupNames.length === 0, `店名不重複（重複：${dupNames.join("、") || "無"}）`);
const dupAddr = dup(cafes.map((c) => c.address));
ok(dupAddr.length === 0, `地址不重複（重複：${dupAddr.join("、") || "無"}）`);
const dupUrl = dup(data.SOURCES.map((s) => s.url));
ok(dupUrl.length === 0, `來源網址不重複（重複：${dupUrl.length}）`);
ok(data.SOURCES.every((s) => s.title && /^https:\/\//.test(s.url)), "來源都有標題與 https 網址");
const badIg = cafes.filter((c) => "instagram" in c && !/^[A-Za-z0-9._]{1,30}$/.test(c.instagram));
ok(badIg.length === 0, `Instagram 帳號格式正確（有問題：${badIg.map((c) => c.name).join("、") || "無"}）`);
ok(cafes.every((c) => !("hot" in c) || c.hot === true), "hot 欄位只用 true");
ok(/^\d{4}-\d{2}-\d{2}$/.test(data.CHECKED_AT), `CHECKED_AT 格式正確（${data.CHECKED_AT}）`);
ok(!/sb_secret_|service_role/.test(read("cafes.js") + read("app.js") + read("index.html")), "網頁檔案沒有 secret key");

// ---------- 2. 版本與快取 ----------
const html = read("index.html");
const sw = read("sw.js");
const vs = [...new Set([...html.matchAll(/\?v=([\w-]+)/g)].map((m) => m[1]))];
const swv = (sw.match(/const VERSION = "([\w-]+)"/) || [])[1];
ok(vs.length === 1 && vs[0] === swv, `index.html 的 ?v=（${vs.join(",")}）與 sw.js 的 VERSION（${swv}）一致`);
const pre = [...sw.matchAll(/"\.\/([^"?]*)(?:\?v=" \+ VERSION)?"/g)].map((m) => m[1]).filter(Boolean);
const missing = pre.filter((f) => !fs.existsSync(path.join(ROOT, f)));
ok(missing.length === 0, `PRECACHE 的檔案都存在（缺少：${missing.join("、") || "無"}）`);

// ---------- 3. 投影片 ----------
const slides = load("slides.js").SLIDES || [];
ok(slides.length > 0 && slides.every((s) => fs.existsSync(path.join(ROOT, s.src))), `投影片圖片都存在（${slides.length} 張）`);
ok(slides.every((s) => s.author && s.license && /^https:\/\//.test(s.source) && s.alt), "投影片都有作者、授權、來源與替代文字");

// ---------- 4. 網頁 ----------
(async () => {
  let chromium;
  try { ({ chromium } = require("playwright")); } catch (e) {
    ok(false, "找不到 Playwright，略過網頁檢查");
    return finish();
  }
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
    ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml",
    ".jpg": "image/jpeg", ".woff2": "font/woff2", ".txt": "text/plain" };
  let down = false;
  // 模擬 GitHub Pages 的 /repair-system/ 子路徑
  const srv = http.createServer((req, res) => {
    if (down) { req.socket.destroy(); return; }
    let u = decodeURIComponent(req.url.split("?")[0]);
    if (!u.startsWith("/repair-system/")) { res.writeHead(404); return res.end(); }
    u = u.slice("/repair-system".length);
    if (u.endsWith("/")) u += "index.html";
    const p = path.join(ROOT, u);
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
    res.end(fs.readFileSync(p));
  }).listen(0);
  const BASE = `http://localhost:${srv.address().port}/repair-system/`;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(BASE);
    await page.waitForSelector(".cafe");
    ok((await page.locator(".cafe").count()) === cafes.length, `卡片數量等於資料筆數（${cafes.length}）`);
    ok((await page.textContent("#checked-at")) === data.CHECKED_AT, "頁面顯示查詢日期");
    const [sw2, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    ok(sw2 <= iw, `手機寬度沒有橫向捲動（${sw2}/${iw}）`);

    // 篩選：用資料中第一個縣市與它的第一個行政區
    const c0 = cafes[0];
    await page.selectOption("#city", c0.city);
    ok((await page.locator(".cafe").count()) === cafes.filter((c) => c.city === c0.city).length, `縣市篩選正確（${c0.city}）`);
    await page.selectOption("#district", c0.city + "|" + c0.district);
    ok((await page.locator(".cafe").count()) === cafes.filter((c) => c.city === c0.city && c.district === c0.district).length, `行政區篩選正確（${c0.district}）`);
    await page.click("#reset-btn");
    await page.fill("#search", c0.name);
    ok((await page.locator(".cafe-name").allTextContents()).includes(c0.name), `搜尋店名正確（${c0.name}）`);
    const href = await page.locator(".map-btn").first().getAttribute("href");
    ok(href.startsWith("https://www.google.com/maps/search/?api=1&query="), "地圖連結格式正確");
    await page.click("#reset-btn");

    // 熱門咖啡推薦：每個縣市 3 間，按鈕只顯示熱門店，可再搭配縣市篩選
    const hotCafes = cafes.filter((c) => c.hot);
    ok(data.CITY_ORDER.every((city) => hotCafes.filter((c) => c.city === city).length === 3), `每個縣市都有 3 間熱門推薦（共 ${hotCafes.length} 間）`);
    ok((await page.locator(".hot-badge").count()) === hotCafes.length, "熱門店家卡片顯示「熱門」標籤");
    await page.click("#hot-btn");
    ok((await page.getAttribute("#hot-btn", "aria-pressed")) === "true" && (await page.locator(".cafe").count()) === hotCafes.length, "按「熱門咖啡推薦」只顯示熱門店");
    await page.selectOption("#city", c0.city);
    ok((await page.locator(".cafe").count()) === 3, `熱門推薦可搭配縣市篩選（${c0.city} 3 間）`);
    await page.click("#reset-btn");
    ok((await page.getAttribute("#hot-btn", "aria-pressed")) === "false" && (await page.locator(".cafe").count()) === cafes.length, "清除篩選後取消熱門推薦");

    // Instagram：每張卡片都有一列；有帳號的連到店家頁面，沒有的連到 Google 搜尋
    ok((await page.locator(".ig-link").count()) === cafes.length, "每間咖啡廳都有 Instagram 連結");
    const igCafe = cafes.find((c) => c.instagram);
    if (igCafe) {
      await page.fill("#search", igCafe.name);
      const igHref = await page.locator(".ig-link").first().getAttribute("href");
      ok(igHref === `https://www.instagram.com/${igCafe.instagram}/`, `有帳號的店連到 Instagram 頁面（${igCafe.name}）`);
      await page.click("#reset-btn");
    }
    const noIg = cafes.find((c) => !c.instagram);
    await page.fill("#search", noIg.name);
    const sHref = await page.locator(".ig-link").first().getAttribute("href");
    ok(sHref.startsWith("https://www.google.com/search?q=") && decodeURIComponent(sHref).includes(noIg.name) &&
      (await page.locator(".ig-link").first().getAttribute("rel")) === "noopener", "沒有帳號的店改連 Google 搜尋");
    await page.click("#reset-btn");

    // 路線規劃
    const route = await page.locator(".route-btn").first().getAttribute("href");
    ok(route.startsWith("https://www.google.com/maps/dir/?api=1&destination="), "單店路線連結格式正確");
    ok(!(await page.isVisible("#trip-bar")), "沒有行程時不顯示行程列");
    const tb = page.locator(".trip-btn");
    for (let i = 0; i < 3; i++) await tb.nth(i).click();
    ok(await page.isVisible("#trip-bar") && (await page.textContent("#trip-count")).includes("3"), "加入 3 間後顯示行程列");
    await page.click("#trip-open");
    ok((await page.locator(".trip-stop").count()) === 3, "行程視窗列出 3 站");
    const go = new URL(await page.getAttribute("#trip-go", "href"));
    ok(go.searchParams.get("waypoints").split("|").length === 2 && go.searchParams.get("destination").startsWith(cafes[2].name) && go.searchParams.get("travelmode") === "driving",
      "多站路線：2 個中途點、終點為第 3 站、預設開車");
    await page.locator(".trip-stop").nth(2).locator("button").first().click(); // 第 3 站往前移
    const go2 = new URL(await page.getAttribute("#trip-go", "href"));
    ok(go2.searchParams.get("destination").startsWith(cafes[1].name), "調整順序後終點跟著改變");
    await page.selectOption("#trip-mode", "transit");
    const go3 = new URL(await page.getAttribute("#trip-go", "href"));
    ok(await page.isVisible("#trip-mode-note") && !go3.searchParams.has("waypoints") && go3.searchParams.get("travelmode") === "transit", "大眾運輸只規劃到第 1 站並顯示說明");
    await page.click("#trip-close");
    await tb.nth(3).click(); await tb.nth(4).click();
    ok((await page.textContent("#trip-count")).includes("4") && (await page.textContent("#toast-text")).includes("最多"), "行程最多 4 間");
    await page.reload(); await page.waitForSelector(".cafe");
    ok((await page.textContent("#trip-count")).includes("4") && (await page.inputValue("#trip-mode")) === "transit", "重新整理後保留行程與交通方式");
    await page.click("#trip-open"); await page.click("#trip-clear"); await page.click("#trip-close");
    ok(!(await page.isVisible("#trip-bar")), "清空行程後隱藏行程列");

    // Service Worker 與離線
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForSelector(".cafe");
    ok(await page.evaluate(() => !!navigator.serviceWorker.controller), "Service Worker 控制頁面");
    down = true;
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector(".cafe");
    ok((await page.locator(".cafe").count()) === cafes.length, "離線重新整理仍看得到清單");
    ok(errors.length === 0, `沒有 JavaScript 錯誤${errors.length ? "：" + errors.join("；") : ""}`);
  } catch (e) {
    ok(false, "網頁檢查發生錯誤：" + e.message);
  }
  await browser.close();
  srv.close();
  finish();
})();

function finish() {
  console.log(failed ? `\n${failed} 項未通過` : "\n全部通過");
  process.exitCode = failed ? 1 : 0;
}
