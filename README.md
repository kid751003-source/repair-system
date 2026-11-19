# 島嶼咖啡散策

根目錄網頁是「島嶼咖啡散策」：收錄全台 22 縣市的咖啡廳，依縣市、行政區與特色篩選，列出地址、營業時間、公休日、特色標籤，並附 Google 地圖連結。可安裝成手機 App（PWA）。

Instagram：每張卡片都有 Instagram 一列。有查證來源的店家（`cafes.js` 的 `instagram` 欄位）直接連到店家帳號；其他店家顯示「搜尋 Instagram」，用 Google 搜尋店名找帳號。每月更新時會陸續補上查證過的帳號。

路線規劃：每張卡片有「路線」按鈕（從目前位置導航到這間店），也可以按「加入行程」排最多 4 間咖啡廳，在行程視窗調整順序、選交通方式（開車、機車、步行、自行車、大眾運輸）後，用 Google 地圖一次規劃多站路線。大眾運輸無法加入中途點，只會規劃到第 1 間。行程存在瀏覽器（localStorage），不會上傳。

網址：https://kid751003-source.github.io/repair-system/

## 網頁檔案

純 HTML/CSS/JavaScript，不需要資料庫或金鑰。

- `index.html`、`style.css`、`app.js`：頁面、樣式與篩選功能。
- `cafes.js`：咖啡廳資料與資料來源清單。
- `manifest.webmanifest`、`sw.js`、`icons/`：PWA 設定、離線快取與圖示。
- `fonts/`：標題用的 Noto Serif TC（思源宋體）子集，只含「島嶼咖啡散策」六個字，依 SIL Open Font License 1.1 授權（`fonts/OFL.txt`）。改標題文字時要重新產生子集，否則新字會改用系統的宋體或明體顯示。
- `slides.js`、`images/slides/`：頁首的咖啡類型投影片。照片來自 Wikimedia Commons，皆為創用 CC 授權，每張的作者、授權與原始頁面寫在 `slides.js`，畫面上也會顯示。CC BY-SA 照片的裁切版本同樣依 CC BY-SA 授權。

## 資料說明

- 資料由 AI 透過網路搜尋公開文章整理，查詢日期寫在 `cafes.js` 的 `CHECKED_AT`，來源列在 `SOURCES`。
- 營業時間、公休日常會變動，出發前請以店家官方公告為準。
- `verify: true` 的店家，來源之間互相矛盾或查不到資料，頁面上會標示「⚠ 需確認」。
- 新增或修改店家：編輯 `cafes.js` 的 `CAFES`（每筆都要填 `city` 縣市與 `district` 行政區），並更新 `CHECKED_AT`。新增縣市時不用改程式，篩選選單會自動出現；縣市排列順序由 `CITY_ORDER` 決定。

## 檢查

在根目錄執行 `node tests/check.js`，會檢查資料欄位、重複店家與來源、版本號一致、離線快取檔案、投影片授權，並用手機寬度實際開啟網頁（篩選、搜尋、地圖連結、離線瀏覽）。需要 Playwright 與 Chromium；全部通過時結束代碼為 0。

## 每月更新

每月 1 日有排程任務，會開一個新的雲端工作階段，依 `AGENTS.md` 的「每月更新店家」流程輪流查證約 4 個縣市的店家，並建立 Pull Request、通過檢查後合併。

## 預覽與發佈

- 本機預覽：在根目錄執行 `python3 -m http.server 8000`，再開啟 http://localhost:8000/。
- 發佈：GitHub 的 Settings → Pages，來源選 `main` 分支的根目錄（`/ (root)`）。
- 安裝成 App（PWA）：
  - Android、電腦版 Chrome／Edge：按頁首的「安裝 App」按鈕（或瀏覽器選單的「安裝應用程式」）。
  - iPhone、iPad：用 Safari 開啟，頁首會顯示步驟：「分享 → 加入主畫面」。
  - 離線時可以瀏覽上次載入的清單與投影片；有新版本時，畫面下方會提示「重新整理」。
  - 長按 App 圖示有捷徑：景觀咖啡廳、深夜營業、不限時。網址也可以帶參數直接篩選，例如 `?city=台南市&tag=老宅&q=咖啡`。
  - 安裝畫面的預覽截圖放在 `images/screenshots/`，畫面大改時請重新截圖。
- 更新網頁檔案時：同時更新 `index.html` 的 `?v=` 版本號與 `sw.js` 的 `VERSION`（兩者要一致），使用者下次開啟就會換成新版。

## 其他資料夾

- `設備借用/`：工地設備借用登記系統的需求筆記、專案規則與 Supabase 建表 SQL。
- 先前的報修登記系統文件仍保留：`報修需求筆記.txt`、`文件/報修欄位表.xlsx`、`supabase/schema.sql`。報修登記網頁已由咖啡廳彙整取代。
