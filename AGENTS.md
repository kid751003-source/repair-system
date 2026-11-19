# 專案規則：島嶼咖啡散策

根目錄網頁是「島嶼咖啡散策」（收錄全台 22 縣市），用 GitHub Pages 發佈（https://kid751003-source.github.io/repair-system/）。純 HTML/CSS/JavaScript，不需要建置工具、資料庫或金鑰。`設備借用/` 是另一個專案，有自己的 `AGENTS.md`，在那個資料夾工作時以它為準。

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

- 每筆都要填 `city`（縣市）與 `district`（區、鄉、鎮、市）；縣市名稱用「台」字（例如台北市、台南市），並列在 `CITY_ORDER` 裡。
- 同一間店不要重複收錄；新增前先搜尋 `cafes.js` 是否已有。
- 只放查得到來源的資料，並把來源加進 `SOURCES`；查不到的欄位寫「未查到」，不要自行推測。
- 來源之間互相矛盾或資料不全時，設 `verify: true`，並在 `note` 寫明哪裡不一致。
- 更新資料時，同時更新 `CHECKED_AT` 為查詢日期。
- 店家是公開營業的商家，可以用真實店名與地址；不要放店員、顧客或評論者的個人資料。
- 營業時間常變動，頁面上要保留「出發前請以店家公告為準」的提醒。
- `hot`（選填）：熱門推薦，每個縣市固定 3 間，只標在被多篇推薦文章重複介紹的店，並把文章加進 `SOURCES`。熱門店歇業或刪除時，從同縣市另選一間補上，維持每縣市 3 間（`tests/check.js` 會檢查）。
- `instagram`（選填）：店家官方 Instagram 帳號，不含 @。只填來源文章或店家官網寫明的帳號，並把來源加進 `SOURCES`；來源寫的帳號互相不一致或查不到就不要填，頁面會自動顯示「搜尋 Instagram」連結。

## 金鑰與機密

- 這個網頁不需要任何金鑰。日後若接上 Supabase，前端只能用 publishable key（`sb_publishable_` 開頭）。
- secret key（`sb_secret_` 開頭）與 service_role key 不可以寫進任何檔案，包括程式碼、設定檔、文件、commit 訊息與 Pull Request 說明。

## 修改網頁檔案時

- 修改 `style.css`、`cafes.js`、`app.js` 後，同時更新 `index.html` 裡的 `?v=` 版本號與 `sw.js` 的 `VERSION`，兩者要一致，使用者才會拿到新版。
- 新增要離線使用的檔案時，加進 `sw.js` 的 `PRECACHE`。
- 一律用 `textContent` 顯示資料，不要用 `innerHTML` 插入資料內容。
- 外部連結加上 `target="_blank"` 與 `rel="noopener"`。

## 每月更新店家

每月排程會依這個流程更新資料（也可以手動照做）：

1. 依 `CITY_ORDER` 輪流處理：以「月份 − 1」除以 6 的餘數決定這次的組別，第 0 組是第 1–4 個縣市、第 1 組是第 5–8 個……第 5 組是第 21–22 個縣市，大約半年輪完一次。
2. 對這些縣市的每間店上網搜尋近期資料：
   - 營業時間、公休日有新資訊時更新；來源互相矛盾就設 `verify: true` 並在 `note` 寫明。
   - 找到確實的歇業或停業資訊（店家公告或多個近期來源）才刪除該店，並在 Pull Request 列出刪除原因與來源；只有一個來源時改設 `verify: true` 並註明「可能已歇業」。
   - 原本 `verify: true` 的店若查到一致的資料，就改回 `false` 並清除不一致的說明。
   - 還沒有 `instagram` 的店，順便搜尋官方 Instagram 帳號；有來源寫明且一致才填入。
3. 每個處理的縣市最多新增 3 間有地址與營業時間的新店，遵守「咖啡廳資料」的規則（不重複、要有來源）。
4. 新的來源加進 `SOURCES`；`CHECKED_AT` 改為當天日期；更新 `index.html` 的 `?v=` 與 `sw.js` 的 `VERSION`。
5. 執行 `node tests/check.js` 全部通過後，才建立 Pull Request 並合併。Pull Request 要列出：處理的縣市、更新／新增／刪除的店家與原因。
6. 網路被擋或搜尋不到資料時，不要猜測；把查不到的店家列在 Pull Request 說明，資料維持原樣。

## 驗證

- 本機預覽：在根目錄執行 `python3 -m http.server 8000`，開啟 http://localhost:8000/。
- 用手機寬度檢查：沒有橫向捲動；搜尋、縣市、行政區、特色篩選結果正確；地圖連結帶店名與地址。
- 確認 Service Worker 註冊成功，離線重新整理仍能看到清單。
- 確認 `index.html` 的 `?v=` 與 `sw.js` 的 `VERSION` 一致。
- 自動檢查：在根目錄執行 `node tests/check.js`，全部通過才合併。

## 完成後

- 用 GitHub 外掛建立 Pull Request，標題用繁體中文。
- 說明要寫：做了什麼、怎麼驗證的；畫面有變動時附截圖。
- 確認沒有金鑰、沒有個人資料後，用 GitHub 外掛把 Pull Request 合併進 `main`。
