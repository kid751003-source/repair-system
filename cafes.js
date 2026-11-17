// 台中咖啡廳彙整資料
//
// 資料來源：網路上公開的咖啡廳推薦文章（清單見 SOURCES），由 AI 透過網路搜尋整理。
// 查詢日期：CHECKED_AT。營業時間、公休日常會變動，前往前請以店家官方公告為準。
// verify: true 表示來源之間互相矛盾或查不到，特別需要先確認。
//
// 欄位：
//   name     店名
//   district 行政區
//   address  地址（臺中市可省略）
//   hours    營業時間
//   closed   公休日
//   tags     特色標籤
//   note     補充說明
//   verify   是否需要特別確認
window.CAFE_DATA = {
  CHECKED_AT: "2026-11-17",

  CAFES: [
    {
      name: "Pharos Coffee（台中綠美圖）",
      district: "西屯區",
      address: "台中市西屯區中科路2201號",
      hours: "10:00–17:30",
      closed: "週一",
      tags: ["現場候位", "大片窗景"],
      note: "位於台中綠美圖內，圓形吧台與大片玻璃窗。",
      verify: false,
    },
    {
      name: "享。拾光 Fun Time",
      district: "西屯區",
      address: "台中市西屯區國安一路51號",
      hours: "07:30–16:30",
      closed: "未查到",
      tags: ["不限時", "插座", "Wi-Fi", "早午餐"],
      note: "近中科商圈。",
      verify: false,
    },
    {
      name: "時光",
      district: "中區",
      address: "台中市中區台灣大道一段199巷1號",
      hours: "10:00–18:00",
      closed: "週三",
      tags: ["現場候位"],
      note: "每人需點一杯飲品或一份餐點。",
      verify: false,
    },
    {
      name: "Mamonaku Café（復古車廂）",
      district: "中區",
      address: "台中火車站舊站月台",
      hours: "13:00–18:00 或 12:00–18:00（來源不一致）",
      closed: "週二",
      tags: ["復古車廂", "不提供預約"],
      note: "位於台中火車站舊站月台；各來源的營業時間不一致。",
      verify: true,
    },
    {
      name: "早捌 x 柳川",
      district: "中區",
      address: "台中市中區柳川西路三段18號",
      hours: "未查到",
      closed: "未查到",
      tags: ["不限時", "插座", "免服務費"],
      note: "來源未寫營業時間。",
      verify: true,
    },
    {
      name: "Peakless Coffee Roasters",
      district: "西區",
      address: "台中市西區五權西路一段21號",
      hours: "每天 11:00–18:00",
      closed: "未寫（來源寫每天營業）",
      tags: ["新開幕", "自家烘焙", "老宅", "手沖"],
      note: "近國美館的兩層樓老宅，日式直火烘焙。電話 04-2372-8001。",
      verify: false,
    },
    {
      name: "MITAKA S 3e CAFE",
      district: "西區",
      address: "台中市西區五權路2-201巷8號",
      hours: "10:00–17:30",
      closed: "週一、週二",
      tags: ["需訂位"],
      note: "採線上訂位。",
      verify: false,
    },
    {
      name: "At three café",
      district: "西區",
      address: "台中市西區中興三巷15號",
      hours: "平日 11:30–20:00；假日 10:30–20:00",
      closed: "週二",
      tags: ["勤美商圈"],
      note: "營業時間與公休日僅一份來源提到，未能交叉確認。電話 04-2301-1670。",
      verify: true,
    },
    {
      name: "成真咖啡（審計新村）",
      district: "西區",
      address: "台中市西區民生路370號",
      hours: "平日 09:00–20:00、週末 09:00–21:00，或每天 09:00–23:00（來源不一致）",
      closed: "未查到",
      tags: ["甜點", "舒芙蕾鬆餅"],
      note: "位於審計新村旁；各來源的營業時間不一致。",
      verify: true,
    },
    {
      name: "同齊咖吡 北屯旗艦店",
      district: "北屯區",
      address: "台中市北屯區熱河路二段226號",
      hours: "每天 08:00–24:00",
      closed: "未寫（來源寫每天營業）",
      tags: ["不限時", "插座", "Wi-Fi", "深夜營業"],
      note: "民俗公園旁，有停車場。電話 04-2247-8366。",
      verify: false,
    },
    {
      name: "松日咖啡",
      district: "北屯區",
      address: "台中市北屯區松文街83號",
      hours: "週一 10:00–18:00；週二至週日 09:00–18:00",
      closed: "未寫",
      tags: ["插座", "Wi-Fi", "客滿才限時"],
      note: "無客滿不限時。",
      verify: false,
    },
    {
      name: "祌咖啡 Chung Café",
      district: "北屯區",
      address: "台中市北屯區三光北一街37號",
      hours: "平日 10:00–22:00；假日 11:00–19:00",
      closed: "未查到",
      tags: ["深夜營業"],
      note: "",
      verify: false,
    },
    {
      name: "G'day",
      district: "南區",
      address: "台中市南區五權南路100號",
      hours: "09:00–21:00",
      closed: "週一",
      tags: ["不限時", "插座"],
      note: "",
      verify: false,
    },
    {
      name: "啡文學咖啡館 大英旗艦店",
      district: "南屯區",
      address: "台中市南屯區大墩十四街265號",
      hours: "07:30–22:30（最後點餐 22:00）",
      closed: "未查到",
      tags: ["不限時", "插座", "Wi-Fi", "免服務費", "深夜營業"],
      note: "",
      verify: false,
    },
    {
      name: "小鍋咖啡甜點",
      district: "東區",
      address: "台中市東區大勇街28號",
      hours: "未查到",
      closed: "未查到",
      tags: ["不限時", "插座", "甜點"],
      note: "平日低消任一品項；假日低消每人 150 元。",
      verify: true,
    },
  ],

  // 搜尋到的來源文章（2026-11-17 查詢）
  SOURCES: [
    { title: "2026台中咖啡廳推薦20家（美麗佳人 Marie Claire）", url: "https://www.marieclaire.com.tw/lifestyle/taste/96089" },
    { title: "Peakless Coffee Roasters 介紹（upssmile）", url: "https://upssmile.com/270970/peakless-coffee-roasters" },
    { title: "考前衝刺不孤單！台中不限時咖啡廳讀書名單（臺中觀光旅遊網）", url: "https://taichung.travel/zh-tw/diary/detail/4509" },
    { title: "台中深夜咖啡廳：同齊咖吡（udn 女子漾）", url: "https://woman.udn.com/woman/story/123162/8240232" },
    { title: "享拾光 Fun Time 介紹（tony60533）", url: "https://www.tony60533.com/fun-time/" },
    { title: "台中不限時咖啡廳 11 間（趣趣 TreaTrip）", url: "https://treatrip.com/food/unlimited-cafe-in_taichung/" },
    { title: "台中 8 間有插座不限時咖啡廳（痞客邦 dalin209）", url: "https://dalin209.pixnet.net/blog/posts/5071053615" },
    { title: "台中超過 20 間不限時餐廳咖啡館（Nini and Blue）", url: "https://niniandblue.com/blog/post/218469025" },
    { title: "精選 16 間台中不限時讀書咖啡廳（SOLER 風格誌）", url: "https://soler.com.tw/taichangcoffee/" },
    { title: "成真咖啡菜單（gwan.tw）", url: "https://gwan.tw/cometruecoffee-menu/" },
    { title: "At three café 店家資訊（FooTinder）", url: "https://en.footinder.app/places/642b96d9dbf53b7e7e2e3738" },
    { title: "台中咖啡廳推薦（美食板 TVBS）", url: "https://supertaste.tvbs.com.tw/food/328392" },
  ],
};
