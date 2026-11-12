// Supabase 連線設定
// 這兩個值會公開在網頁上，只能放 publishable key（sb_publishable_ 開頭），
// 絕對不要放 secret key 或 service_role key。
// 資料安全靠資料庫的 GRANT 與 RLS（見 supabase/schema.sql）。
window.APP_CONFIG = {
  SUPABASE_URL: "https://lyovhpipknmzuppjierm.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_iNsdpIDD50BaDlK2WT2U6Q_oDSmWnoh",
};
