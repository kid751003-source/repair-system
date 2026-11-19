// 島嶼咖啡散策：篩選與顯示
(function () {
  "use strict";

  // ---------- 提示訊息（toast） ----------
  const toastEl = document.getElementById("toast");
  let toastTimer;
  function toast(text, actionLabel, onAction, ms = 5000) {
    if (!toastEl) return;
    document.getElementById("toast-text").textContent = text;
    const btn = document.getElementById("toast-action");
    btn.hidden = !actionLabel;
    btn.textContent = actionLabel || "";
    btn.onclick = onAction || null;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => { toastEl.hidden = true; }, ms);
  }

  // ---------- PWA：Service Worker ----------
  // 離線時仍能瀏覽；有新版本時提示重新整理
  if ("serviceWorker" in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloading) return; // 第一次安裝不提示
      toast("已有新版本", "重新整理", () => { reloading = true; location.reload(); }, 0);
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* 不支援或失敗時，網頁照常使用 */ });
    });
  }

  // ---------- PWA：離線提示 ----------
  const offlineText = "目前離線：仍可瀏覽上次儲存的清單，地圖與來源連結需要網路。";
  window.addEventListener("offline", () => toast(offlineText, "", null, 8000));
  window.addEventListener("online", () => toast("已恢復連線。"));
  if (navigator.onLine === false) window.addEventListener("load", () => toast(offlineText, "", null, 8000));

  // ---------- PWA：安裝 ----------
  (function installUi() {
    const btn = document.getElementById("install-btn");
    const hint = document.getElementById("ios-install-hint");
    if (!btn || !hint) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (standalone) return; // 已經以 App 開啟，不顯示安裝入口

    // Android、電腦版 Chrome／Edge：攔下瀏覽器的安裝提示，改由按鈕觸發
    let deferred = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferred = e;
      btn.hidden = false;
    });
    btn.addEventListener("click", async () => {
      if (!deferred) return;
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      deferred = null;
      btn.hidden = true;
      if (choice && choice.outcome === "accepted") toast("安裝完成，可以從主畫面開啟。");
    });
    window.addEventListener("appinstalled", () => { btn.hidden = true; });

    // iPhone／iPad 的 Safari 沒有安裝按鈕，改顯示加入主畫面的步驟
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let dismissed = false;
    try { dismissed = localStorage.getItem("ios-install-hint-closed") === "1"; } catch (_) { /* 無法讀取時照常顯示 */ }
    if (isIOS && isSafari && !dismissed) hint.hidden = false;
    document.getElementById("ios-hint-close").addEventListener("click", () => {
      hint.hidden = true;
      try { localStorage.setItem("ios-install-hint-closed", "1"); } catch (_) { /* 略過 */ }
    });
  })();

  const data = window.CAFE_DATA || { CAFES: [], SOURCES: [], CHECKED_AT: "" };
  const cafes = data.CAFES;

  const $ = (id) => document.getElementById(id);
  const searchEl = $("search");
  const cityEl = $("city");
  const districtEl = $("district");
  const tagBox = $("tag-filters");
  const listEl = $("cafe-list");
  const countEl = $("result-count");
  const selectedTags = new Set();

  // 一律用 textContent 建立元素，避免插入 HTML
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // 線條圖示（地址、時間、公休、地圖、Instagram）
  const ICONS = {
    pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M12 12.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
    calendar: "M4 6.5h16v13.5H4z M4 10.5h16 M8 3.5v4 M16 3.5v4 M9.5 14.5l5 3.5 M14.5 14.5l-5 3.5",
    map: "M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z M9 4v13.5 M15 6.5V20",
    route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 17h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16",
    plus: "M12 5v14 M5 12h14",
    check: "M5 12.5l4.5 4.5L19 7",
    instagram: "M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z M12 15.8a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6z M17 7h.01",
  };
  function icon(name) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", ICONS[name]);
    svg.append(path);
    return svg;
  }

  function mapUrl(cafe) {
    return "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(cafe.name + " " + cafe.address);
  }

  // ---------- 路線規劃 ----------
  // 單店：「路線」開啟 Google 地圖從目前位置導航。
  // 行程：最多 4 間（Google 地圖在手機瀏覽器最多接受 3 個中途點），存在這支手機的瀏覽器裡。
  const TRIP_MAX = 4;
  const TRIP_KEY = "cafe-trip-v1";
  const MODE_KEY = "cafe-trip-mode-v1";
  const byName = new Map(cafes.map((c) => [c.name, c]));
  let trip = [];
  try { trip = (JSON.parse(localStorage.getItem(TRIP_KEY) || "[]") || []).filter((n) => byName.has(n)).slice(0, TRIP_MAX); } catch (_) { trip = []; }
  const saveTrip = () => { try { localStorage.setItem(TRIP_KEY, JSON.stringify(trip)); } catch (_) { /* 無法儲存時只在這次瀏覽有效 */ } };
  const placeOf = (c) => c.name + " " + c.address;

  function directionsUrl(stops, mode) {
    const p = new URLSearchParams({ api: "1", destination: placeOf(stops[stops.length - 1]) });
    if (mode) p.set("travelmode", mode);
    if (stops.length > 1) p.set("waypoints", stops.slice(0, -1).map(placeOf).join("|"));
    return "https://www.google.com/maps/dir/?" + p.toString();
  }

  // ---------- 篩選選項 ----------
  $("checked-at").textContent = data.CHECKED_AT;

  // 縣市依 CITY_ORDER（由北到南）排序，沒列在裡面的放最後
  const order = data.CITY_ORDER || [];
  const rank = (city) => (order.includes(city) ? order.indexOf(city) : order.length);
  [...new Set(cafes.map((c) => c.city))].sort((a, b) => rank(a) - rank(b)).forEach((city) => {
    const n = cafes.filter((c) => c.city === city).length;
    const opt = el("option", "", `${city}（${n}）`);
    opt.value = city;
    cityEl.append(opt);
  });

  // 行政區選單只列出所選縣市的區域；選「全部縣市」時列出全部並標上縣市
  function fillDistricts() {
    const city = cityEl.value;
    const keep = districtEl.value;
    const list = cafes.filter((c) => !city || c.city === city);
    const keys = [...new Set(list.map((c) => c.city + "|" + c.district))];
    districtEl.replaceChildren(Object.assign(el("option", "", "全部行政區"), { value: "" }));
    keys.forEach((key) => {
      const [c, d] = key.split("|");
      const n = list.filter((x) => x.city === c && x.district === d).length;
      const opt = el("option", "", `${city ? d : c + " " + d}（${n}）`);
      opt.value = key;
      districtEl.append(opt);
    });
    districtEl.value = keys.includes(keep) ? keep : "";
  }
  fillDistricts();

  // 篩選按鈕只放 7 間以上共有的特色，依出現次數排序；其他特色可用搜尋找到
  const tagCount = new Map();
  cafes.forEach((c) => c.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
  [...tagCount.entries()]
    .filter(([, n]) => n >= 7)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
    .forEach(([tag]) => {
      const btn = el("button", "chip", tag);
      btn.type = "button";
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", () => {
        if (selectedTags.has(tag)) selectedTags.delete(tag); else selectedTags.add(tag);
        btn.setAttribute("aria-pressed", String(selectedTags.has(tag)));
        render();
      });
      tagBox.append(btn);
    });

  // ---------- 網址參數（App 捷徑用）：?q=關鍵字&city=縣市&tag=特色 ----------
  (function applyParams() {
    const p = new URLSearchParams(location.search);
    const q = p.get("q");
    const city = p.get("city");
    if (q) searchEl.value = q;
    if (city && [...cityEl.options].some((o) => o.value === city)) { cityEl.value = city; fillDistricts(); }
    p.getAll("tag").forEach((t) => {
      const btn = [...tagBox.querySelectorAll(".chip")].find((b) => b.textContent === t);
      if (btn) { selectedTags.add(t); btn.setAttribute("aria-pressed", "true"); }
    });
  })();

  // ---------- 清單 ----------
  function matches(cafe) {
    const q = searchEl.value.trim().toLowerCase();
    if (cityEl.value && cafe.city !== cityEl.value) return false;
    if (districtEl.value && cafe.city + "|" + cafe.district !== districtEl.value) return false;
    for (const t of selectedTags) if (!cafe.tags.includes(t)) return false;
    if (!q) return true;
    const hay = [cafe.name, cafe.city, cafe.district, cafe.address, cafe.note, ...cafe.tags].join(" ").toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  }

  function row(iconName, label, value, unknown) {
    const div = el("div", "info-row");
    const text = el("span", unknown ? "info-value unknown" : "info-value", value);
    text.prepend(el("span", "sr-only", label + "："));
    div.append(icon(iconName), text);
    return div;
  }

  // Instagram：有查證過的帳號（cafes.js 的 instagram 欄位）直接連到店家頁面；
  // 沒有的話連到 Google 搜尋「店名＋縣市＋Instagram」，不自行猜測帳號。
  const IG_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
  function igRow(cafe) {
    const div = el("div", "info-row");
    const a = el("a", "ig-link");
    a.target = "_blank";
    a.rel = "noopener";
    if (cafe.instagram && IG_HANDLE.test(cafe.instagram)) {
      a.textContent = "@" + cafe.instagram;
      a.href = "https://www.instagram.com/" + cafe.instagram + "/";
      a.setAttribute("aria-label", cafe.name + " 的 Instagram（@" + cafe.instagram + "）");
    } else {
      a.textContent = "搜尋 Instagram";
      a.classList.add("ig-search");
      a.href = "https://www.google.com/search?q=" + encodeURIComponent(cafe.name + " " + cafe.city + " Instagram");
      a.setAttribute("aria-label", "用 Google 搜尋 " + cafe.name + " 的 Instagram");
    }
    div.append(icon("instagram"), a);
    return div;
  }

  const isUnknown = (v) => /未查到|未寫/.test(v);

  function card(cafe) {
    const li = el("li", "cafe");
    const body = el("div", "cafe-body");

    const head = el("div", "cafe-head");
    head.append(el("h2", "cafe-name", cafe.name), el("span", "district", cafe.city + " " + cafe.district));
    body.append(head);

    if (cafe.verify) {
      const v = el("p", "verify");
      v.append(el("strong", "", "需確認"), el("span", "", "來源不一致或資料不全，出發前請先確認"));
      body.append(v);
    }

    const info = el("div", "info");
    info.append(
      row("pin", "地址", cafe.address, false),
      row("clock", "營業", cafe.hours, isUnknown(cafe.hours)),
      row("calendar", "公休", cafe.closed, isUnknown(cafe.closed)),
      igRow(cafe)
    );
    body.append(info);

    if (cafe.tags.length) {
      const tags = el("div", "tags");
      cafe.tags.forEach((t) => tags.append(el("span", "tag", t)));
      body.append(tags);
    }
    if (cafe.note) body.append(el("p", "note", cafe.note));
    li.append(body);

    const actions = el("div", "cafe-actions");
    const a = el("a", "map-btn");
    a.append(icon("map"), el("span", "", "地圖"));
    a.href = mapUrl(cafe);
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", cafe.name + " 的 Google 地圖");

    const r = el("a", "route-btn");
    r.append(icon("route"), el("span", "", "路線"));
    r.href = directionsUrl([cafe]);
    r.target = "_blank";
    r.rel = "noopener";
    r.setAttribute("aria-label", "從目前位置到 " + cafe.name + " 的路線");

    const t = el("button", "trip-btn");
    t.type = "button";
    t.dataset.name = cafe.name;
    t.addEventListener("click", () => toggleTrip(cafe.name));
    setTripBtn(t);

    actions.append(a, r, t);
    li.append(actions);
    return li;
  }

  function render() {
    const shown = cafes.filter(matches);
    if (shown.length) {
      listEl.replaceChildren(...shown.map(card));
      countEl.replaceChildren("共 ", el("strong", "", String(shown.length)), ` 間（總計 ${cafes.length} 間）`);
    } else {
      listEl.replaceChildren(el("li", "empty", "☕ 找不到符合的咖啡廳，試試減少篩選條件或換個關鍵字。"));
      countEl.textContent = "沒有符合條件的咖啡廳";
    }
  }

  searchEl.addEventListener("input", render);
  cityEl.addEventListener("change", () => { fillDistricts(); render(); });
  districtEl.addEventListener("change", render);
  $("reset-btn").addEventListener("click", () => {
    searchEl.value = "";
    cityEl.value = "";
    fillDistricts();
    districtEl.value = "";
    selectedTags.clear();
    tagBox.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", "false"));
    render();
  });

  // ---------- 資料來源 ----------
  const srcList = $("source-list");
  $("source-count").textContent = String(data.SOURCES.length);
  data.SOURCES.forEach((s) => {
    const li = el("li");
    const a = el("a", "", s.title);
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    li.append(a);
    srcList.append(li);
  });

  // ---------- 景觀咖啡廳投影片 ----------
  (function slideshow() {
    const slides = window.SLIDES || [];
    const box = $("slideshow");
    if (!slides.length || !box) return;
    const track = $("slides");
    const dotsBox = box.querySelector(".slide-dots");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    slides.forEach((s, i) => {
      const li = el("li", "slide");
      li.setAttribute("role", "group");
      li.setAttribute("aria-roledescription", "slide");
      li.setAttribute("aria-label", `${i + 1} / ${slides.length}：${s.name}`);

      const img = el("img");
      img.src = s.src;
      img.alt = s.alt;
      img.width = 1280;
      img.height = 720;
      img.decoding = "async";
      if (i > 0) img.loading = "lazy";

      const cap = el("div", "slide-caption");
      cap.append(el("h2", "", s.name), el("p", "slide-place", s.place));
      const actions = el("div", "slide-actions");
      if (s.find) {
        const find = el("button", "slide-find", "在清單中查看");
        find.type = "button";
        find.addEventListener("click", () => {
          searchEl.value = s.find;
          cityEl.value = "";
          fillDistricts();
          districtEl.value = "";
          selectedTags.clear();
          tagBox.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", "false"));
          render();
          document.querySelector(".toolbar").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        });
        actions.append(find);
      }
      const credit = el("span", "slide-credit", "照片：");
      const a = el("a", "", `${s.author}／${s.license}`);
      a.href = s.source;
      a.target = "_blank";
      a.rel = "noopener";
      credit.append(a, "（Wikimedia Commons）");
      actions.append(credit);
      cap.append(actions);

      li.append(img, cap);
      track.append(li);

      const dot = el("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `第 ${i + 1} 張：${s.name}`);
      dot.addEventListener("click", () => go(i));
      dotsBox.append(dot);
    });
    box.hidden = false;

    let index = 0;
    const width = () => track.clientWidth;
    function go(i) {
      index = (i + slides.length) % slides.length;
      track.scrollTo({ left: index * width(), behavior: reduceMotion ? "auto" : "smooth" });
      mark();
    }
    function mark() {
      dotsBox.querySelectorAll("button").forEach((d, i) => d.setAttribute("aria-current", String(i === index)));
    }
    // 使用者手指滑動時，依捲動位置更新目前是第幾張
    let scrollTimer;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const i = Math.round(track.scrollLeft / Math.max(1, width()));
        if (i !== index) { index = i; mark(); }
      }, 80);
    }, { passive: true });
    window.addEventListener("resize", () => track.scrollTo({ left: index * width() }));
    box.querySelector(".prev").addEventListener("click", () => { go(index - 1); restart(); });
    box.querySelector(".next").addEventListener("click", () => { go(index + 1); restart(); });
    mark();

    // 自動播放：每 5 秒換一張；滑鼠移入、觸控或鍵盤操作時暫停；偏好減少動態時不自動播放
    let timer = null;
    let paused = false;
    function start() { if (!reduceMotion && !timer) timer = setInterval(() => { if (!paused && !document.hidden) go(index + 1); }, 5000); }
    function restart() { clearInterval(timer); timer = null; start(); }
    box.addEventListener("mouseenter", () => { paused = true; });
    box.addEventListener("mouseleave", () => { paused = false; });
    box.addEventListener("focusin", () => { paused = true; });
    box.addEventListener("focusout", () => { paused = false; });
    track.addEventListener("touchstart", () => { paused = true; }, { passive: true });
    track.addEventListener("touchend", () => { setTimeout(() => { paused = false; }, 4000); }, { passive: true });
    start();
  })();

  // ---------- 行程（多站路線） ----------
  const tripBar = $("trip-bar");
  const tripDialog = $("trip-dialog");
  const tripList = $("trip-list");
  const tripMode = $("trip-mode");
  const tripGo = $("trip-go");
  const tripNote = $("trip-mode-note");
  try { const m = localStorage.getItem(MODE_KEY); if (m && [...tripMode.options].some((o) => o.value === m)) tripMode.value = m; } catch (_) { /* 略過 */ }

  function setTripBtn(btn) {
    const on = trip.includes(btn.dataset.name);
    btn.setAttribute("aria-pressed", String(on));
    btn.replaceChildren(icon(on ? "check" : "plus"), el("span", "", on ? "已加入行程" : "加入行程"));
  }
  function toggleTrip(name) {
    const i = trip.indexOf(name);
    if (i >= 0) trip.splice(i, 1);
    else if (trip.length >= TRIP_MAX) { toast(`行程最多 ${TRIP_MAX} 間（Google 地圖手機版的限制），請先移除一間。`); return; }
    else { trip.push(name); toast(`已加入行程（${trip.length}／${TRIP_MAX}）`, "查看行程", openTrip, 4000); }
    saveTrip();
    updateTrip();
  }
  function move(i, d) {
    const j = i + d;
    if (j < 0 || j >= trip.length) return;
    [trip[i], trip[j]] = [trip[j], trip[i]];
    saveTrip();
    updateTrip();
  }
  function updateTrip() {
    listEl.querySelectorAll(".trip-btn").forEach(setTripBtn);
    tripBar.hidden = trip.length === 0;
    document.body.classList.toggle("has-trip", trip.length > 0);
    $("trip-count").textContent = `行程：${trip.length} 間咖啡廳`;

    tripList.replaceChildren(...trip.map((name, i) => {
      const c = byName.get(name);
      const li = el("li", "trip-stop");
      const text = el("div", "trip-stop-text");
      text.append(el("strong", "", c.name), el("span", "", c.city + " " + c.district + "・" + c.hours));
      const ctl = el("div", "trip-stop-ctl");
      const up = el("button", "", "↑"); up.type = "button"; up.disabled = i === 0;
      up.setAttribute("aria-label", "把 " + c.name + " 往前移"); up.addEventListener("click", () => move(i, -1));
      const down = el("button", "", "↓"); down.type = "button"; down.disabled = i === trip.length - 1;
      down.setAttribute("aria-label", "把 " + c.name + " 往後移"); down.addEventListener("click", () => move(i, 1));
      const del = el("button", "", "✕"); del.type = "button";
      del.setAttribute("aria-label", "從行程移除 " + c.name); del.addEventListener("click", () => toggleTrip(c.name));
      ctl.append(up, down, del);
      li.append(text, ctl);
      return li;
    }));
    if (!trip.length) tripList.append(el("li", "trip-empty", "還沒有加入咖啡廳。在清單中按「加入行程」就會出現在這裡。"));

    // 大眾運輸不支援中途點，只規劃到第 1 站
    const transit = tripMode.value === "transit" && trip.length > 1;
    tripNote.hidden = !transit;
    const stops = trip.map((n) => byName.get(n));
    if (stops.length) tripGo.href = directionsUrl(transit ? stops.slice(0, 1) : stops, tripMode.value);
    tripGo.toggleAttribute("aria-disabled", !stops.length);
    tripGo.classList.toggle("disabled", !stops.length);
  }
  function openTrip() {
    updateTrip();
    if (typeof tripDialog.showModal === "function") tripDialog.showModal(); else tripDialog.setAttribute("open", "");
  }
  function closeTrip() {
    if (typeof tripDialog.close === "function") tripDialog.close(); else tripDialog.removeAttribute("open");
  }
  $("trip-open").addEventListener("click", openTrip);
  $("trip-close").addEventListener("click", closeTrip);
  tripDialog.addEventListener("click", (e) => { if (e.target === tripDialog) closeTrip(); }); // 點背景關閉
  tripMode.addEventListener("change", () => { try { localStorage.setItem(MODE_KEY, tripMode.value); } catch (_) { /* 略過 */ } updateTrip(); });
  $("trip-clear").addEventListener("click", () => { trip = []; saveTrip(); updateTrip(); });
  tripGo.addEventListener("click", (e) => { if (!trip.length) e.preventDefault(); });

  // ---------- 回到頂端 ----------
  const toTop = $("to-top");
  const onScroll = () => { toTop.hidden = window.scrollY < 800; };
  window.addEventListener("scroll", onScroll, { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0 }));
  onScroll();

  render();
  updateTrip();
})();
