// 報修登記前端：新增報修、顯示最近 20 筆
(function () {
  "use strict";

  const TABLE = "repair_requests";
  const LIST_LIMIT = 20;
  const LIMITS = { reporter_name: 50, location: 100, description: 1000 };
  const CATEGORIES = ["設備", "網路", "環境", "其他"];
  const URGENCIES = ["低", "中", "高"];

  const $ = (id) => document.getElementById(id);
  const form = $("report-form");
  const submitBtn = $("submit-btn");
  const formMessage = $("form-message");
  const listEl = $("report-list");
  const listStatus = $("list-status");
  const refreshBtn = $("refresh-btn");
  const descCount = $("desc-count");

  const timeFormat = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  function showMessage(el, text, ok) {
    el.textContent = text;
    el.className = "message " + (ok ? "message-ok" : "message-error");
    el.hidden = false;
  }

  function setFormEnabled(enabled) {
    Array.from(form.elements).forEach((el) => { el.disabled = !enabled; });
  }

  // 檢查設定：還是預留文字、或不是網址時，停用表單並提示
  const cfg = window.APP_CONFIG || {};
  const url = String(cfg.SUPABASE_URL || "").trim();
  const key = String(cfg.SUPABASE_PUBLISHABLE_KEY || "").trim();
  let configProblem = "";
  if (!/^https:\/\/\S+$/.test(url) || !key || /[【】]/.test(key)) {
    configProblem = "尚未設定 Supabase：請在 config.js 填入專案網址與 publishable key。";
  } else if (/^sb_secret_/.test(key) || /service_role/.test(key)) {
    configProblem = "config.js 放的是 secret 金鑰，請立刻改成 publishable key 並到 Supabase 重新產生 secret 金鑰。";
  } else if (!window.supabase || typeof window.supabase.createClient !== "function") {
    configProblem = "無法載入 Supabase 程式庫，請檢查網路連線後重新整理。";
  }

  if (configProblem) {
    const warn = $("config-warning");
    warn.textContent = configProblem;
    warn.hidden = false;
    setFormEnabled(false);
    refreshBtn.disabled = true;
    listStatus.textContent = "無法載入清單。";
    return;
  }

  const client = window.supabase.createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 把資料庫錯誤轉成看得懂的訊息，並附上錯誤代碼與原始訊息，方便排查
  // action：「送出」或「清單載入」
  function explainError(error, action) {
    const code = (error && error.code) || "";
    const raw = (error && (error.message || String(error))) || "未知錯誤";
    let hint;
    if (code === "23514") {
      hint = "資料不符合規則（類別、緊急程度或字數），請檢查後再送出。";
    } else if (code === "42501") {
      hint = "資料庫拒絕存取，請確認已執行 supabase/schema.sql 的 GRANT 與 RLS 設定。";
    } else if (code === "PGRST205" || code === "42P01") {
      hint = "資料庫的 API 找不到 repair_requests 資料表。請確認已在 Supabase 的 SQL Editor 執行 supabase/schema.sql；" +
        "若已執行，請再執行 notify pgrst, 'reload schema'; 重新載入，並確認 Data API 的 Exposed schemas 包含 public。";
    } else if (/fetch|network/i.test(raw)) {
      hint = "網路連線失敗，請稍後再試。";
    } else {
      hint = "發生未預期的錯誤。";
    }
    const detail = code ? `（錯誤代碼 ${code}：${raw}）` : `（${raw}）`;
    return `${action}失敗：${hint}${detail}`;
  }

  // ---------- 表單 ----------
  function readForm() {
    const data = new FormData(form);
    return {
      reporter_name: String(data.get("reporter_name") || "").trim(),
      location: String(data.get("location") || "").trim(),
      category: String(data.get("category") || ""),
      description: String(data.get("description") || "").trim(),
      urgency: String(data.get("urgency") || "中"),
    };
  }

  function validate(row) {
    const problems = [];
    const mark = (id, bad) => $(id).closest(".field").classList.toggle("invalid", bad);

    const nameBad = !row.reporter_name || row.reporter_name.length > LIMITS.reporter_name;
    const locBad = !row.location || row.location.length > LIMITS.location;
    const catBad = !CATEGORIES.includes(row.category);
    const descBad = !row.description || row.description.length > LIMITS.description;
    mark("reporter_name", nameBad);
    mark("location", locBad);
    mark("category", catBad);
    mark("description", descBad);

    if (nameBad) problems.push("報修人（1～50 字）");
    if (locBad) problems.push("地點或部門（1～100 字）");
    if (catBad) problems.push("類別");
    if (descBad) problems.push("問題說明（1～1000 字）");
    if (!URGENCIES.includes(row.urgency)) problems.push("緊急程度");
    return problems;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    formMessage.hidden = true;

    const row = readForm();
    const problems = validate(row);
    if (problems.length) {
      showMessage(formMessage, "請確認：" + problems.join("、"), false);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "送出中…";
    try {
      // 不送 status、id、created_at，由資料庫自動產生
      const { error } = await client.from(TABLE).insert(row);
      if (error) {
        showMessage(formMessage, explainError(error, "送出"), false);
        return;
      }
      form.reset();
      descCount.textContent = "0";
      showMessage(formMessage, "已送出報修，謝謝！", true);
      loadList();
    } catch (err) {
      showMessage(formMessage, explainError(err, "送出"), false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "送出報修";
    }
  });

  form.addEventListener("input", (event) => {
    if (event.target.id === "description") descCount.textContent = String(event.target.value.length);
    const field = event.target.closest(".field");
    if (field) field.classList.remove("invalid");
  });

  // ---------- 清單 ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text; // 一律用 textContent，避免插入惡意 HTML
    return node;
  }

  function formatTime(value) {
    const d = new Date(value);
    return isNaN(d) ? "" : timeFormat.format(d);
  }

  function renderList(rows) {
    listEl.replaceChildren();
    if (!rows.length) {
      listStatus.textContent = "目前還沒有報修。";
      return;
    }
    listStatus.textContent = "";
    rows.forEach((r) => {
      const li = el("li", "report-item");
      const top = el("div", "report-top");
      top.append(
        el("span", "tag", r.category),
        el("span", "tag tag-urgency-" + r.urgency, "緊急：" + r.urgency),
        el("span", "tag", r.status)
      );
      li.append(
        top,
        el("p", "report-desc", r.description),
        el("div", "report-meta", r.reporter_name + "・" + r.location + "・" + formatTime(r.created_at))
      );
      listEl.append(li);
    });
  }

  async function loadList() {
    refreshBtn.disabled = true;
    listStatus.textContent = "載入中…";
    try {
      const { data, error } = await client
        .from(TABLE)
        .select("id, created_at, reporter_name, location, category, description, urgency, status")
        .order("created_at", { ascending: false })
        .limit(LIST_LIMIT);
      if (error) {
        listStatus.textContent = explainError(error, "清單載入");
        return;
      }
      renderList(data || []);
    } catch (err) {
      listStatus.textContent = "清單載入失敗：網路連線問題，請稍後再試。";
    } finally {
      refreshBtn.disabled = false;
    }
  }

  refreshBtn.addEventListener("click", loadList);
  loadList();
})();
