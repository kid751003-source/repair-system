// 中部咖啡廳彙整：篩選與顯示
(function () {
  "use strict";

  // PWA：註冊 Service Worker（離線時仍能瀏覽、可安裝到主畫面）
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* 不支援或失敗時，網頁照常使用 */ });
    });
  }

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

  function mapUrl(cafe) {
    return "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(cafe.name + " " + cafe.address);
  }

  // ---------- 篩選選項 ----------
  $("checked-at").textContent = data.CHECKED_AT;

  [...new Set(cafes.map((c) => c.city))].forEach((city) => {
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

  // 篩選按鈕只放 2 間以上共有的特色，依出現次數排序；其他特色可用搜尋找到
  const tagCount = new Map();
  cafes.forEach((c) => c.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
  [...tagCount.entries()]
    .filter(([, n]) => n >= 2)
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

  function row(label, value, unknown) {
    const div = el("div", "info-row");
    div.append(el("span", "info-label", label), el("span", unknown ? "info-value unknown" : "info-value", value));
    return div;
  }

  const isUnknown = (v) => /未查到|未寫/.test(v);

  function card(cafe) {
    const li = el("li", "card cafe");

    const head = el("div", "cafe-head");
    head.append(el("h2", "cafe-name", cafe.name), el("span", "district", cafe.city + " " + cafe.district));
    li.append(head);

    if (cafe.verify) li.append(el("p", "verify", "⚠ 需確認：來源不一致或資料不全，出發前請先確認"));

    li.append(
      row("地址", cafe.address, false),
      row("營業", cafe.hours, isUnknown(cafe.hours)),
      row("公休", cafe.closed, isUnknown(cafe.closed))
    );

    if (cafe.tags.length) {
      const tags = el("div", "tags");
      cafe.tags.forEach((t) => tags.append(el("span", "tag", t)));
      li.append(tags);
    }
    if (cafe.note) li.append(el("p", "note", cafe.note));

    const a = el("a", "btn map-btn", "地圖");
    a.href = mapUrl(cafe);
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", cafe.name + " 的 Google 地圖");
    li.append(a);
    return li;
  }

  function render() {
    const shown = cafes.filter(matches);
    listEl.replaceChildren(...shown.map(card));
    countEl.textContent = shown.length
      ? `共 ${shown.length} 間（總計 ${cafes.length} 間）`
      : "沒有符合條件的咖啡廳，試試減少篩選條件。";
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
  data.SOURCES.forEach((s) => {
    const li = el("li");
    const a = el("a", "", s.title);
    a.href = s.url;
    a.target = "_blank";
    a.rel = "noopener";
    li.append(a);
    srcList.append(li);
  });

  render();
})();
