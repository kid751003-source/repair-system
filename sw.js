// 台灣咖啡廳彙整 PWA 的 Service Worker
//
// 快取策略：本站檔案（網頁、資料、樣式、程式、圖示）先連網路拿最新版，
// 連不上才用快取。這樣資料更新後不會卡在舊版，離線時仍能瀏覽上次的清單。
// 地圖、資料來源等外部網站的連結不攔截。
//
// 版本號：修改下面 PRECACHE 裡的檔案或 index.html 的 ?v= 版本號時，
// 請一起更新 VERSION，舊快取會在新版啟用時自動清除。
const VERSION = "20261117-5";
const PREFIX = "taichung-cafe-";
const CACHE = PREFIX + VERSION;
// 先前「報修登記」版本留下的快取，一併清除
const OLD_PREFIXES = [PREFIX, "repair-app-"];

const PRECACHE = [
  "./",
  "./index.html",
  "./style.css?v=" + VERSION,
  "./cafes.js?v=" + VERSION,
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
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n !== CACHE && OLD_PREFIXES.some((p) => n.startsWith(p)))
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return; // 外部網站不攔截
  event.respondWith(networkFirst(req));
});

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
