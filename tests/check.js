// 島嶼咖啡散策：資料與網頁檢查
//
// 用法（在儲存庫根目錄）：node tests/check.js
// 需要 Playwright 與 Chromium（雲端工作環境已預先安裝；本機可先執行 npm i -D playwright 與 npx playwright install chromium）。
//
// 檢查內容：
//   1. 資料：cafes.js 每筆欄位齊全、縣市在 CITY_ORDER 內、店名與「縣市＋地址」不重複、來源網址不重複、CHECKED_AT 格式正確
//   2. 版本：index.html 的 ?v= 與 sw.js 的 VERSION 一致；PRECACHE 裡的本機檔案都存在
//   3. 投影片：slides.js 的圖片都存在，作者、授權、來源都有填
//   4. 網頁（手機寬度）：卡片數量等於資料筆數、沒有橫向捲動、沒有 JavaScript 錯誤、篩選正常、
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
