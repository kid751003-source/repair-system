# 報修登記系統
用於登記報修事項並查看報修清單。
雲端任務測試
欄位定義與範例資料：[文件/報修欄位表.xlsx](文件/報修欄位表.xlsx)

## 網頁前端

根目錄的 `index.html`、`style.css`、`app.js`、`config.js` 是報修登記網頁，純 HTML/CSS/JavaScript，從 CDN 載入 supabase-js。

- 設定：`config.js` 放 Supabase 專案網址與 publishable key（公開金鑰）。不要放 secret 金鑰。
- 資料庫：先在 Supabase 的 SQL Editor 執行 `supabase/schema.sql`。
- 本機預覽：在根目錄執行 `python3 -m http.server 8000`，再開啟 http://localhost:8000/。
- 發佈：GitHub 的 Settings → Pages，來源選 `main` 分支的根目錄（`/ (root)`）。
