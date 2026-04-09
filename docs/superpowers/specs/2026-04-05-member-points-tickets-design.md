# 會員專區 + 點數票券系統設計

**日期：** 2026-04-05
**狀態：** 已核准

---

## 一、會員專區（LIFF `/member`）

### 頂部：用戶資訊卡
- LINE 頭像 + 名稱
- 點數餘額（大字顯示）
- 持有票券數量

### Tab 1：我的預約（現有，保留）
- 即將到來 / 過去的預約
- 取消、改時段功能

### Tab 2：點數
- 目前餘額
- 異動紀錄列表（加點/扣點/退點，含日期、原因、金額）

### Tab 3：票券
- 持有票券列表（服務名稱、剩餘/總張數、到期日）
- 已用完或過期的票券灰色顯示

### Tab 4：個人資料
- 編輯姓名、Email、電話
- 儲存按鈕

---

## 二、預約付款流程（LIFF）

在確認預約步驟（step 5）之前，插入付款方式選擇步驟。只有服務有定價（price > 0）時才出現。

### 顯示邏輯
- 顯示服務定價
- 可用選項根據服務設定動態顯示：
  - **使用票券**：`acceptTicket` 為 true 且用戶有該服務的可用票券
  - **使用點數**：`acceptPoints` 為 true 且用戶有點數 → 滑桿或輸入框讓用戶決定抵扣金額，剩餘線下付款
  - **線下付款**：永遠顯示，全額到場付
- 選擇後帶入確認頁，顯示付款明細

### 付款處理
- 選擇票券：booking 建立時扣 CustomerTicket.used + 1，記錄 paidWith="ticket"
- 選擇點數：booking 建立時扣 Customer.points，建立 PointTransaction(reason="booking")，記錄 paidWith="points" + pointsUsed
- 線下付款：paidWith=null，不扣任何東西
- 取消預約時：自動退還票券/點數

---

## 三、後台管理

### 服務設定（擴充現有 service-form）
- 定價（price）數字輸入
- 接受票券 toggle
- 接受點數 toggle + 點數換算比例（pointsPerUnit）

### 用戶管理（擴充現有 customers 頁面）
- 用戶卡片顯示點數餘額
- 編輯 modal 新增：
  - 點數調整：加點/扣點 + 原因備註
  - 票券管理：新增票券（選服務、張數、到期日）
  - 點數異動紀錄列表
  - 票券列表

### 系統設定（擴充現有 system 頁面）
- 儲值方案設定（例如「1000 元 = 1200 點」）— 作為管理員手動加點時的參考
- 預約完成回饋點數（例如「完成預約送 50 點」）

---

## 四、API 端點

| 端點 | Method | 用途 |
|---|---|---|
| `/api/member/points` | GET | 查詢點數餘額 + 異動紀錄 |
| `/api/member/tickets` | GET | 查詢持有票券 |
| `/api/member/profile` | GET/PUT | 查詢/更新個人資料 |
| `/api/admin/customers/[id]/points` | POST | 管理員加點/扣點 |
| `/api/admin/customers/[id]/tickets` | GET/POST/DELETE | 管理員管理票券 |
| `/api/booking`（修改現有） | POST | 處理付款邏輯 |

---

## 五、預約完成自動回饋

在 booking 狀態變為 `completed` 時（透過後台編輯或 API）：
- 檢查系統設定的回饋點數
- 如果 > 0，自動加點到 Customer.points
- 建立 PointTransaction(reason="reward", notes="預約完成回饋")

---

## 六、取消退還邏輯

預約取消時：
- paidWith="ticket"：CustomerTicket.used - 1
- paidWith="points"：Customer.points += pointsUsed，建立 PointTransaction(reason="refund")
- paidWith=null：不做任何退還

---

## 七、Schema（已存在，不需修改）

- `Customer.points` — 點數餘額
- `CustomerTicket` — 票券（customerId, serviceId, total, used, expiresAt）
- `PointTransaction` — 點數異動記錄（customerId, amount, reason, bookingId）
- `Service.price` — 服務定價
- `Service.acceptTicket` — 是否接受票券
- `Service.acceptPoints` — 是否接受點數
- `Service.pointsPerUnit` — 點數換算比例
- `Booking.paidWith` — 付款方式
- `Booking.ticketId` — 使用的票券
- `Booking.pointsUsed` — 使用的點數

---

## 八、SiteSettings 新增欄位

- `rewardPointsOnComplete` Int @default(0) — 完成預約回饋點數
