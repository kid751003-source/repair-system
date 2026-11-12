-- =====================================================================
-- 工地設備借用登記系統：Supabase 建表 SQL
-- 資料表：public.equipment_loans（借用紀錄）
--         public.equipment_returns（歸還紀錄）
-- 檢視表：public.equipment_loan_status（借用清單＋狀態）
--
-- 這份檔案是設計稿，請在 Supabase 的 SQL Editor 檢查後再手動執行。
-- 需求來源：設備借用/需求筆記.txt
--   ・只有登入的工地主任可以新增與讀取；未登入的人什麼都不能做。
--   ・借用紀錄與歸還紀錄一律不能修改或刪除，歸還時另外新增一筆歸還紀錄。
--   ・一筆借用只能有一筆歸還紀錄；設備借出中時不能再被借出。
--
-- 安全設計分三層：
--   1. CHECK：限制欄位值與文字長度。
--   2. GRANT：只給 authenticated（登入使用者）讀取與新增需要的欄位。
--   3. RLS  ：只有被標記為工地主任的帳號能讀寫。
--
-- 工地主任帳號設定（執行本檔後，由管理者在 SQL Editor 逐一執行）：
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--                              || '{"role": "site_manager"}'::jsonb
--    where email = '<工地主任的登入 Email>';
-- app_metadata 只有管理者能改，使用者自己改不了，所以拿來當角色標記。
-- 另外請到 Authentication 設定關閉「Allow new users to sign up」，不開放自行註冊。
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 借用紀錄（第 3 層：CHECK）
-- ---------------------------------------------------------------------
-- 說明：
-- ・id、borrowed_at（借出時間）、created_by（登記人帳號）由資料庫自動產生，
--   前端不能指定（GRANT 也不開放這三欄）。
-- ・created_by 記錄是哪個工地主任登記的，需求筆記沒有列，
--   是為了「不能修改」時仍能追查而加上的。
-- ・文字長度上限（設備 100、借用人 50、地點 100、備註 500 字）與
--   「預計歸還時間必填」是本設計自訂的，筆記沒有寫明，屬於「待確認」。
create table if not exists public.equipment_loans (
  -- 主鍵：系統自動產生的 UUID
  id           uuid        primary key default gen_random_uuid(),

  -- 借出時間：送出時由資料庫自動填入
  borrowed_at  timestamptz not null default now(),

  -- 設備名稱或編號：1～100 字
  equipment    text        not null
    constraint equipment_loans_equipment_len
      check (char_length(btrim(equipment)) between 1 and 100),

  -- 借用人：1～50 字
  borrower     text        not null
    constraint equipment_loans_borrower_len
      check (char_length(btrim(borrower)) between 1 and 50),

  -- 借用工地或地點（目前只有 1 個工地，填工地內的位置）：1～100 字
  location     text        not null
    constraint equipment_loans_location_len
      check (char_length(btrim(location)) between 1 and 100),

  -- 預計歸還時間：必須晚於借出時間
  due_at       timestamptz not null
    constraint equipment_loans_due_after_borrow
      check (due_at > borrowed_at),

  -- 備註：可空白，最多 500 字
  note         text
    constraint equipment_loans_note_len
      check (note is null or char_length(note) <= 500),

  -- 登記人：目前登入的帳號，自動帶入
  created_by   uuid        not null default auth.uid()
);

-- 清單依借出時間由新到舊排序
create index if not exists equipment_loans_borrowed_at_idx
  on public.equipment_loans (borrowed_at desc);

-- 檢查「設備借出中」時，用正規化後的設備名稱查詢
create index if not exists equipment_loans_equipment_key_idx
  on public.equipment_loans (lower(btrim(equipment)));

comment on table  public.equipment_loans             is '設備借用紀錄（示範資料，全為虛構）；只新增，不修改、不刪除';
comment on column public.equipment_loans.borrowed_at is '借出時間，系統自動產生';
comment on column public.equipment_loans.equipment   is '設備名稱或編號';
comment on column public.equipment_loans.borrower    is '借用人';
comment on column public.equipment_loans.location    is '借用工地或地點';
comment on column public.equipment_loans.due_at      is '預計歸還時間';
comment on column public.equipment_loans.note        is '備註';
comment on column public.equipment_loans.created_by  is '登記人帳號（auth.users.id），系統自動產生';

-- ---------------------------------------------------------------------
-- 歸還紀錄（第 3 層：CHECK）
-- ---------------------------------------------------------------------
-- 說明：
-- ・歸還時另外新增一筆，不修改借用紀錄。
-- ・loan_id 加上 unique：一筆借用只能有一筆歸還紀錄，重複歸還會被拒絕。
-- ・on delete restrict：有歸還紀錄的借用紀錄不能被刪除（雙重保險）。
-- ・returned_at（實際歸還時間）由系統產生；是否允許補登較早時間，筆記列為待確認。
create table if not exists public.equipment_returns (
  -- 主鍵：系統自動產生的 UUID
  id           uuid        primary key default gen_random_uuid(),

  -- 對應的借用紀錄：每筆借用只能歸還一次
  loan_id      uuid        not null
    constraint equipment_returns_loan_id_unique unique
    references public.equipment_loans (id) on delete restrict,

  -- 實際歸還時間：送出時由資料庫自動填入
  returned_at  timestamptz not null default now(),

  -- 歸還狀況：只能是 正常／損壞／遺失
  condition    text        not null
    constraint equipment_returns_condition_allowed
      check (condition in ('正常', '損壞', '遺失')),

  -- 備註：可空白，最多 500 字
  note         text
    constraint equipment_returns_note_len
      check (note is null or char_length(note) <= 500),

  -- 登記人：目前登入的帳號，自動帶入
  created_by   uuid        not null default auth.uid()
);

comment on table  public.equipment_returns             is '設備歸還紀錄（示範資料，全為虛構）；只新增，不修改、不刪除';
comment on column public.equipment_returns.loan_id     is '對應的借用紀錄';
comment on column public.equipment_returns.returned_at is '實際歸還時間，系統自動產生';
comment on column public.equipment_returns.condition   is '歸還狀況：正常、損壞、遺失';
comment on column public.equipment_returns.note        is '備註';
comment on column public.equipment_returns.created_by  is '登記人帳號（auth.users.id），系統自動產生';

-- ---------------------------------------------------------------------
-- 規則：設備借出中時不能再被借出（觸發程序）
-- ---------------------------------------------------------------------
-- 說明：
-- ・CHECK 只能檢查同一列，無法查「這台設備有沒有還沒歸還的借用」，所以用觸發程序。
-- ・設備名稱去掉前後空白、不分大小寫比對。自由輸入時，「發電機」與
--   「發電機 1 號」會被當成不同設備；要完全擋住，需改用設備主檔（待確認）。
-- ・pg_advisory_xact_lock：同一台設備同時有兩人送出借用時，讓兩筆依序檢查，
--   避免兩筆都通過。
-- ・security invoker（預設）：檢查時以登入者身分查詢，受 RLS 限制；
--   工地主任可讀取全部紀錄，所以能查到所有借出中的設備。
create or replace function public.equipment_loans_block_double_loan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('equipment:' || lower(btrim(new.equipment))));

  if exists (
    select 1
      from public.equipment_loans l
     where lower(btrim(l.equipment)) = lower(btrim(new.equipment))
       and not exists (
         select 1 from public.equipment_returns r where r.loan_id = l.id
       )
  ) then
    raise exception '設備「%」目前借出中，請先登記歸還再借出。', btrim(new.equipment)
      using errcode = 'P0001',
            hint    = 'equipment_already_on_loan';
  end if;

  return new;
end;
$$;

-- 觸發程序函式不需要被任何角色直接呼叫
revoke all on function public.equipment_loans_block_double_loan() from public, anon, authenticated;

drop trigger if exists equipment_loans_block_double_loan on public.equipment_loans;
create trigger equipment_loans_block_double_loan
  before insert on public.equipment_loans
  for each row
  execute function public.equipment_loans_block_double_loan();

-- ---------------------------------------------------------------------
-- 借用清單檢視表：借用紀錄＋歸還紀錄＋狀態
-- ---------------------------------------------------------------------
-- 說明：
-- ・狀態不另外儲存：有歸還紀錄＝已歸還，沒有＝借出中。
-- ・security_invoker = true：以查詢者身分讀取底下的資料表，RLS 照樣生效
--   （沒有這個設定，檢視表會以建立者身分讀取，等於繞過 RLS）。
create or replace view public.equipment_loan_status
with (security_invoker = true)
as
select
  l.id,
  l.borrowed_at,
  l.equipment,
  l.borrower,
  l.location,
  l.due_at,
  l.note,
  r.returned_at,
  r.condition,
  r.note as return_note,
  case when r.id is null then '借出中' else '已歸還' end as status
from public.equipment_loans l
left join public.equipment_returns r on r.loan_id = l.id;

comment on view public.equipment_loan_status is '借用清單：借用紀錄加上歸還資訊與狀態（借出中／已歸還）';

-- ---------------------------------------------------------------------
-- 權限（第 1 層：GRANT）
-- ---------------------------------------------------------------------
-- 說明：
-- ・這個 Supabase 專案不會自動把新資料表開放給 Data API，必須明確授權；
--   先全部收回，再只給需要的權限。
-- ・anon（未登入）：不給任何權限。
-- ・authenticated（登入使用者）：可讀取，以及新增需要的欄位；不給修改、刪除。
--   登入使用者是否為工地主任，由下面的 RLS 判斷。
-- ・service_role 會略過 RLS，只能在後端使用；secret key 不可以寫進任何檔案。
revoke all on table public.equipment_loans       from public, anon, authenticated;
revoke all on table public.equipment_returns     from public, anon, authenticated;
revoke all on table public.equipment_loan_status from public, anon, authenticated;

grant usage on schema public to authenticated;

-- 讀取
grant select on table public.equipment_loans       to authenticated;
grant select on table public.equipment_returns     to authenticated;
grant select on table public.equipment_loan_status to authenticated;

-- 新增借用：不開放 id、borrowed_at、created_by（由系統產生）
grant insert (equipment, borrower, location, due_at, note)
  on table public.equipment_loans to authenticated;

-- 新增歸還：不開放 id、returned_at、created_by（由系統產生）
grant insert (loan_id, condition, note)
  on table public.equipment_returns to authenticated;

-- 不給 update、delete、truncate：上面已全部收回，這裡不再授予。

-- ---------------------------------------------------------------------
-- 資料列安全（第 2 層：RLS）
-- ---------------------------------------------------------------------
-- 說明：
-- ・只有 app_metadata.role = 'site_manager' 的登入帳號（工地主任）能讀寫。
--   一般登入帳號即使存在，也讀不到、寫不進。
-- ・(select auth.jwt()) 寫成子查詢，讓每次查詢只計算一次，效能較好。
-- ・新增時 created_by 必須是自己，不能冒用別人的帳號登記。
-- ・沒有 update、delete 政策：即使日後誤開權限，RLS 仍會擋下。
alter table public.equipment_loans   enable row level security;
alter table public.equipment_returns enable row level security;

drop policy if exists "工地主任可讀取借用紀錄" on public.equipment_loans;
drop policy if exists "工地主任可新增借用紀錄" on public.equipment_loans;
drop policy if exists "工地主任可讀取歸還紀錄" on public.equipment_returns;
drop policy if exists "工地主任可新增歸還紀錄" on public.equipment_returns;

create policy "工地主任可讀取借用紀錄"
  on public.equipment_loans
  for select
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'site_manager');

create policy "工地主任可新增借用紀錄"
  on public.equipment_loans
  for insert
  to authenticated
  with check (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'site_manager'
    and created_by = (select auth.uid())
  );

create policy "工地主任可讀取歸還紀錄"
  on public.equipment_returns
  for select
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'site_manager');

create policy "工地主任可新增歸還紀錄"
  on public.equipment_returns
  for insert
  to authenticated
  with check (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'site_manager'
    and created_by = (select auth.uid())
  );

commit;

-- ---------------------------------------------------------------------
-- 通知 Data API 重新載入資料表結構
-- ---------------------------------------------------------------------
-- 說明：Data API 會快取資料表清單；建表後若沒有重新載入，
-- 前端可能出現「找不到資料表」（錯誤代碼 PGRST205）。
notify pgrst, 'reload schema';
