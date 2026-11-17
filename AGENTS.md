# 專案規則：中部咖啡廳彙整

根目錄網頁是「中部咖啡廳彙整」（目前收錄台中市、苗栗縣），用 GitHub Pages 發佈（https://kid751003-source.github.io/repair-system/）。純 HTML/CSS/JavaScript，不需要建置工具、資料庫或金鑰。`設備借用/` 是另一個專案，有自己的 `AGENTS.md`，在那個資料夾工作時以它為準。

## 專案結構

- `index.html`、`style.css`、`app.js`：頁面、樣式、搜尋與篩選。
- `cafes.js`：咖啡廳資料（`CAFES`）、資料來源（`SOURCES`）、查詢日期（`CHECKED_AT`）。
- `manifest.webmanifest`、`sw.js`、`icons/`：PWA 設定、離線快取與圖示。
- 先前報修登記系統的文件仍保留：`報修需求筆記.txt`、`文件/報修欄位表.xlsx`、`supabase/schema.sql`。除非被要求，不要修改或刪除。

## 開工前

- 每次開工，先把工作區更新到 GitHub 上最新的 `main`，再開始修改：

  ```bash
  git fetch origin main
  git checkout -B <工作分支> origin/main
  ```

## 咖啡廳資料

- 每筆都要填 `city`（縣市）與 `district`（區、鄉、鎮、市）。
- 只放查得到來源的資料，並把來源加進 `SOURCES`；查不到的欄位寫「未查到」，不要自行推測。
- 來源之間互相矛盾或資料不全時，設 `verify: true`，並在 `note` 寫明哪裡不一致。
- 更新資料時，同時更新 `CHECKED_AT` 為查詢日期。
- 店家是公開營業的商家，可以用真實店名與地址；不要放店員、顧客或評論者的個人資料。
- 營業時間常變動，頁面上要保留「出發前請以店家公告為準」的提醒。

## 金鑰與機密

- 這個網頁不需要任何金鑰。日後若接上 Supabase，前端只能用 publishable key（`sb_publishable_` 開頭）。
- secret key（`sb_secret_` 開頭）與 service_role key 不可以寫進任何檔案，包括程式碼、設定檔、文件、commit 訊息與 Pull Request 說明。

## 修改網頁檔案時

- 修改 `style.css`、`cafes.js`、`app.js` 後，同時更新 `index.html` 裡的 `?v=` 版本號與 `sw.js` 的 `VERSION`，兩者要一致，使用者才會拿到新版。
- 新增要離線使用的檔案時，加進 `sw.js` 的 `PRECACHE`。
- 一律用 `textContent` 顯示資料，不要用 `innerHTML` 插入資料內容。
- 外部連結加上 `target="_blank"` 與 `rel="noopener"`。

## 驗證

- 本機預覽：在根目錄執行 `python3 -m http.server 8000`，開啟 http://localhost:8000/。
- 用手機寬度檢查：沒有橫向捲動；搜尋、縣市、行政區、特色篩選結果正確；地圖連結帶店名與地址。
- 確認 Service Worker 註冊成功，離線重新整理仍能看到清單。
- 確認 `index.html` 的 `?v=` 與 `sw.js` 的 `VERSION` 一致。

## 完成後

- 用 GitHub 外掛建立 Pull Request，標題用繁體中文。
- 說明要寫：做了什麼、怎麼驗證的；畫面有變動時附截圖。
- 確認沒有金鑰、沒有個人資料後，用 GitHub 外掛把 Pull Request 合併進 `main`。
