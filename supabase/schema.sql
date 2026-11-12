-- =====================================================================
-- 報修登記系統：Supabase 建表 SQL
-- 資料表：public.repair_requests
--
-- 這份檔案只是設計稿，請在 Supabase 的 SQL Editor 檢查後再手動執行。
-- 安全設計分三層，缺一不可：
--   1. CHECK：資料庫層限制欄位值與文字長度，不管從哪裡寫入都擋得住。
--   2. GRANT：決定 anon（前端公開金鑰）能碰哪些操作與哪些欄位。
--   3. RLS  ：決定 anon 能讀寫哪些資料列，以及新增時的資料條件。
-- 示範規則（見「報修需求筆記.txt」）：任何人可新增、可讀清單，
-- 但不能修改或刪除。本示範不做登入。
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 建立資料表與 CHECK 限制（第 3 層：CHECK）
-- ---------------------------------------------------------------------
-- 說明：
-- ・id 與 created_at 由資料庫自動產生，前端不能指定（GRANT 也不開放這兩欄）。
-- ・gen_random_uuid() 是 PostgreSQL 13 以上內建函式，Supabase 可直接使用。
-- ・文字欄位用 btrim() 去掉前後空白後計算長度，避免只填空白就能送出。
-- ・長度上限（姓名 50、地點 100、說明 1000 字）是本設計自訂的，
--   筆記沒有寫明，屬於「待確認」。
-- ・報修人姓名、地點、類別、問題說明設為必填（NOT NULL），
--   筆記沒有寫明是否必填，同樣屬於「待確認」。
create table if not exists public.repair_requests (
  -- 主鍵：系統自動產生的 UUID
  id            uuid        primary key default gen_random_uuid(),

  -- 建立時間：送出時由資料庫自動填入（含時區）
  created_at    timestamptz not null default now(),

  -- 報修人姓名：1～50 字
  reporter_name text        not null
    constraint repair_requests_reporter_name_len
      check (char_length(btrim(reporter_name)) between 1 and 50),

  -- 地點或部門：1～100 字
  location      text        not null
    constraint repair_requests_location_len
      check (char_length(btrim(location)) between 1 and 100),

  -- 類別：只能是 設備／網路／環境／其他
  category      text        not null
    constraint repair_requests_category_allowed
      check (category in ('設備', '網路', '環境', '其他')),

  -- 問題說明：1～1000 字
  description   text        not null
    constraint repair_requests_description_len
      check (char_length(btrim(description)) between 1 and 1000),

  -- 緊急程度：只能是 低／中／高，預設「中」
  urgency       text        not null default '中'
    constraint repair_requests_urgency_allowed
      check (urgency in ('低', '中', '高')),

  -- 處理狀態：只能是 待處理／處理中／已完成，預設「待處理」
  status        text        not null default '待處理'
    constraint repair_requests_status_allowed
      check (status in ('待處理', '處理中', '已完成'))
);

-- 清單通常依登記時間由新到舊排序，加索引讓查詢變快
create index if not exists repair_requests_created_at_idx
  on public.repair_requests (created_at desc);

comment on table  public.repair_requests               is '報修登記（示範資料，全為虛構）';
comment on column public.repair_requests.id            is '主鍵，系統自動產生';
comment on column public.repair_requests.created_at    is '登記時間，系統自動產生';
comment on column public.repair_requests.reporter_name is '報修人姓名';
comment on column public.repair_requests.location      is '地點或部門';
comment on column public.repair_requests.category      is '類別：設備、網路、環境、其他';
comment on column public.repair_requests.description   is '問題說明';
comment on column public.repair_requests.urgency       is '緊急程度：低、中、高（預設 中）';
comment on column public.repair_requests.status        is '處理狀態：待處理、處理中、已完成（預設 待處理）';

-- ---------------------------------------------------------------------
-- 權限（第 1 層：GRANT）
-- ---------------------------------------------------------------------
-- 說明：
-- ・這個 Supabase 專案不會自動把新資料表開放給 Data API，
--   所以必須明確授權；這裡先全部收回，再只給需要的權限，避免殘留。
-- ・anon 是前端用公開金鑰連線時的角色。
-- ・authenticated（登入使用者）本示範不做登入，所以不給任何權限。
-- ・service_role 會略過 RLS，只能在後端使用，金鑰絕對不能放進前端。
revoke all on table public.repair_requests from public, anon, authenticated;

-- anon 需要能使用 public schema，才能透過 Data API 存取資料表
grant usage on schema public to anon;

-- 讀取：anon 可以讀整張清單
grant select on table public.repair_requests to anon;

-- 新增：只開放填表需要的欄位。
-- 不開放 id、created_at（由系統產生，不能偽造），也不開放 status
-- （一律使用預設值「待處理」）。若前端送出這些欄位，會被直接拒絕。
grant insert (reporter_name, location, category, description, urgency)
  on table public.repair_requests to anon;

-- 不給 update、delete、truncate：上面已全部收回，這裡不再授予。

-- ---------------------------------------------------------------------
-- 資料列安全（第 2 層：RLS）
-- ---------------------------------------------------------------------
-- 說明：
-- ・啟用 RLS 後，沒有政策允許的操作一律被拒絕。
-- ・只建立 select 與 insert 政策；沒有 update、delete 政策，
--   即使日後不小心授予了 update／delete 權限，RLS 仍會擋下。
alter table public.repair_requests enable row level security;

-- 重新執行本檔時先移除舊政策，避免重複建立失敗
drop policy if exists "任何人可讀取報修清單" on public.repair_requests;
drop policy if exists "任何人可新增待處理報修" on public.repair_requests;

-- 讀取政策：任何人（anon）都能看到所有報修
create policy "任何人可讀取報修清單"
  on public.repair_requests
  for select
  to anon
  using (true);

-- 新增政策：任何人（anon）都能新增，但狀態只能是「待處理」。
-- GRANT 已不開放 status 欄位，這裡是第二道防線：
-- 萬一日後誤把 status 開放給 anon，仍無法新增成其他狀態。
create policy "任何人可新增待處理報修"
  on public.repair_requests
  for insert
  to anon
  with check (status = '待處理');

commit;
