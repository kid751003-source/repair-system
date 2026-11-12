// 報修登記 PWA 的 Service Worker
//
// 快取策略：
// ・本站檔案（網頁、樣式、程式、圖示）：先連網路拿最新版，連不上才用快取。
//   這樣更新後不會卡在舊版，離線時仍能打開畫面。
// ・supabase-js（CDN、網址含固定版本號）：先用快取，沒有才下載。
// ・Supabase 資料（報修清單、送出報修）：一律不快取、不攔截，避免顯示過期資料。
//
// 版本號：修改下面 PRECACHE 裡的檔案或 index.html 的 ?v= 版本號時，
// 請一起更新 VERSION 與 PRECACHE，舊快取會在新版啟用時自動清除。
const VERSION = "20261112-3";
const CACHE = "repair-app-" + VERSION;
const CDN_SUPABASE = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js";

const PRECACHE = [
  "./",
  "./index.html",
  "./style.css?v=" + VERSION,
  "./config.js?v=" + VERSION,
  "./app.js?v=" + VERSION,
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })));
    // CDN 下載失敗不影響安裝，之後第一次使用時再快取
    try {
      await cache.add(new Request(CDN_SUPABASE, { mode: "cors", credentials: "omit" }));
    } catch (_) { /* 略過 */ }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => n.startsWith("repair-app-") && n !== CACHE).map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // 送出報修等寫入請求不攔截

  const url = new URL(req.url);

  if (url.href === CDN_SUPABASE) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 只處理本站檔案；Supabase 等其他網站的請求直接交給瀏覽器
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    // no-cache：向伺服器確認是否有新版，避免拿到瀏覽器快取的舊檔
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (hit) return hit;
    if (req.mode === "navigate") {
      const shell = await cache.match("./index.html");
      if (shell) return shell;
    }
    throw err;
  }
}
