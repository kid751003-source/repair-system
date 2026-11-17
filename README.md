# 中部咖啡廳彙整

根目錄網頁是「中部咖啡廳彙整」：收錄台中市、苗栗縣、彰化縣、南投縣的咖啡廳，依縣市、行政區與特色篩選，列出地址、營業時間、公休日、特色標籤，並附 Google 地圖連結。可安裝成手機 App（PWA）。

網址：https://kid751003-source.github.io/repair-system/

## 網頁檔案

純 HTML/CSS/JavaScript，不需要資料庫或金鑰。

- `index.html`、`style.css`、`app.js`：頁面、樣式與篩選功能。
- `cafes.js`：咖啡廳資料與資料來源清單。
- `manifest.webmanifest`、`sw.js`、`icons/`：PWA 設定、離線快取與圖示。

## 資料說明

- 資料由 AI 透過網路搜尋公開文章整理，查詢日期寫在 `cafes.js` 的 `CHECKED_AT`，來源列在 `SOURCES`。
- 營業時間、公休日常會變動，出發前請以店家官方公告為準。
- `verify: true` 的店家，來源之間互相矛盾或查不到資料，頁面上會標示「⚠ 需確認」。
- 新增或修改店家：編輯 `cafes.js` 的 `CAFES`（每筆都要填 `city` 縣市與 `district` 行政區），並更新 `CHECKED_AT`。新增縣市時不用改程式，篩選選單會自動出現。

## 預覽與發佈

- 本機預覽：在根目錄執行 `python3 -m http.server 8000`，再開啟 http://localhost:8000/。
- 發佈：GitHub 的 Settings → Pages，來源選 `main` 分支的根目錄（`/ (root)`）。
- 安裝成 App：Android Chrome 選「安裝應用程式」，iPhone Safari 選「分享 → 加入主畫面」。離線時可以瀏覽上次載入的清單。
- 更新網頁檔案時：同時更新 `index.html` 的 `?v=` 版本號與 `sw.js` 的 `VERSION`（兩者要一致），使用者下次開啟就會換成新版。

## 其他資料夾

- `設備借用/`：工地設備借用登記系統的需求筆記、專案規則與 Supabase 建表 SQL。
- 先前的報修登記系統文件仍保留：`報修需求筆記.txt`、`文件/報修欄位表.xlsx`、`supabase/schema.sql`。報修登記網頁已由咖啡廳彙整取代。
