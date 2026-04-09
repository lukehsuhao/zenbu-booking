import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ===== 管理員 =====
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.teamMember.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Admin", password: hashedPassword },
  });
  console.log("Seed: admin@example.com / admin123");

  // ===== 提醒規則 =====
  await prisma.reminderRule.createMany({
    data: [
      { type: "line", minutesBefore: 1440, timing: "before" },
      { type: "line", minutesBefore: 60, timing: "before" },
      { type: "line", minutesBefore: 30, timing: "after", notifyProvider: true },
      { type: "email", minutesBefore: 1440, timing: "before" },
    ],
    skipDuplicates: true,
  });
  console.log("Seed: 4 reminder rules");

  // ===== 服務項目 (6個) =====
  const services = [
    { id: "svc-consult", name: "線上諮詢", description: "30 分鐘一對一線上諮詢", duration: 30, slotInterval: 30 },
    { id: "svc-coaching", name: "一對一教練課", description: "60 分鐘專屬教練指導", duration: 60, bufferAfter: 10, slotInterval: 30 },
    { id: "svc-workshop", name: "小班工作坊", description: "90 分鐘小班制實作課程", duration: 90, assignmentMode: "round_robin" as const, slotInterval: 30 },
    { id: "svc-therapy", name: "心理諮商", description: "50 分鐘專業心理諮商", duration: 50, bufferBefore: 5, bufferAfter: 10, requiresApproval: true, slotInterval: 30 },
    { id: "svc-yoga", name: "瑜伽私人課", description: "60 分鐘一對一瑜伽教學", duration: 60, slotInterval: 15 },
    { id: "svc-photo", name: "形象照拍攝", description: "120 分鐘專業形象照拍攝", duration: 120, bufferBefore: 15, bufferAfter: 30, requiresApproval: true, bookingWindowDays: 30, slotInterval: 60 },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log("Seed: 6 services");

  // ===== 服務提供者 (8個) =====
  const providerPassword = await bcrypt.hash("provider123", 10);
  const providers = [
    { id: "prov-amy", name: "Amy Chen", email: "amy@example.com", password: providerPassword },
    { id: "prov-bob", name: "Bob Wang", email: "bob@example.com", password: providerPassword },
    { id: "prov-cathy", name: "Cathy Lin", email: "cathy@example.com", password: providerPassword },
    { id: "prov-david", name: "David Lee", email: "david@example.com", password: providerPassword },
    { id: "prov-emma", name: "Emma Wu", email: "emma@example.com", password: providerPassword },
    { id: "prov-frank", name: "Frank Hsu", email: "frank@example.com", password: providerPassword },
    { id: "prov-grace", name: "Grace Tsai", email: "grace@example.com", password: providerPassword },
    { id: "prov-henry", name: "Henry Chang", email: "henry@example.com", password: providerPassword },
  ];
  for (const p of providers) {
    await prisma.provider.upsert({
      where: { email: p.email },
      update: { password: p.password },
      create: p,
    });
  }
  console.log("Seed: 8 providers (password: provider123)");

  // ===== 服務 <-> 提供者 關聯 =====
  const assignments = [
    { providerId: "prov-amy", serviceId: "svc-consult" },
    { providerId: "prov-amy", serviceId: "svc-coaching" },
    { providerId: "prov-amy", serviceId: "svc-yoga" },
    { providerId: "prov-bob", serviceId: "svc-consult" },
    { providerId: "prov-bob", serviceId: "svc-coaching" },
    { providerId: "prov-cathy", serviceId: "svc-workshop" },
    { providerId: "prov-cathy", serviceId: "svc-consult" },
    { providerId: "prov-david", serviceId: "svc-workshop" },
    { providerId: "prov-david", serviceId: "svc-photo" },
    { providerId: "prov-emma", serviceId: "svc-therapy" },
    { providerId: "prov-emma", serviceId: "svc-consult" },
    { providerId: "prov-frank", serviceId: "svc-coaching" },
    { providerId: "prov-frank", serviceId: "svc-yoga" },
    { providerId: "prov-grace", serviceId: "svc-therapy" },
    { providerId: "prov-grace", serviceId: "svc-workshop" },
    { providerId: "prov-henry", serviceId: "svc-photo" },
    { providerId: "prov-henry", serviceId: "svc-coaching" },
  ];
  for (const a of assignments) {
    await prisma.providerService.upsert({
      where: { providerId_serviceId: a },
      update: {},
      create: a,
    });
  }
  console.log("Seed: provider-service assignments");

  // ===== 排班 =====
  for (const pId of providers.map(p => p.id)) {
    await prisma.availability.upsert({
      where: { id: `avail-${pId}-everyday` },
      update: {},
      create: { id: `avail-${pId}-everyday`, providerId: pId, dayOfWeek: 7, startTime: "09:00", endTime: "18:00", type: "available" },
    });
    await prisma.availability.upsert({
      where: { id: `avail-${pId}-lunch` },
      update: {},
      create: { id: `avail-${pId}-lunch`, providerId: pId, dayOfWeek: 7, startTime: "12:00", endTime: "13:00", type: "excluded" },
    });
  }
  await prisma.availability.upsert({
    where: { id: "avail-prov-amy-sat" },
    update: {},
    create: { id: "avail-prov-amy-sat", providerId: "prov-amy", dayOfWeek: 6, startTime: "10:00", endTime: "15:00", type: "available" },
  });
  await prisma.availability.upsert({
    where: { id: "avail-prov-frank-sat" },
    update: {},
    create: { id: "avail-prov-frank-sat", providerId: "prov-frank", dayOfWeek: 6, startTime: "09:00", endTime: "14:00", type: "available" },
  });
  console.log("Seed: availability for 8 providers");

  // ===== 表單欄位 =====
  const defaultFields = [
    { key: "name", label: "姓名", type: "text", required: true, enabled: true, sortOrder: 0, isBuiltin: true },
    { key: "email", label: "Email", type: "text", required: false, enabled: true, sortOrder: 1, isBuiltin: true },
    { key: "phone", label: "手機號碼", type: "text", required: false, enabled: false, sortOrder: 2, isBuiltin: true },
    { key: "notes", label: "備註", type: "textarea", required: false, enabled: true, sortOrder: 3, isBuiltin: true },
  ];
  for (const svc of services) {
    for (const field of defaultFields) {
      await prisma.formField.upsert({
        where: { serviceId_key: { serviceId: svc.id, key: field.key } },
        update: {},
        create: { ...field, serviceId: svc.id },
      });
    }
  }
  await prisma.formField.upsert({
    where: { serviceId_key: { serviceId: "svc-workshop", key: "experience_level" } },
    update: {},
    create: { serviceId: "svc-workshop", key: "experience_level", label: "您的經驗程度", type: "radio", options: JSON.stringify(["初學者", "有一些基礎", "進階"]), required: true, enabled: true, sortOrder: 4, isBuiltin: false },
  });
  await prisma.formField.upsert({
    where: { serviceId_key: { serviceId: "svc-therapy", key: "concern" } },
    update: {},
    create: { serviceId: "svc-therapy", key: "concern", label: "主要關注議題", type: "checkbox", options: JSON.stringify(["壓力管理", "人際關係", "情緒調適", "職涯發展", "其他"]), required: true, enabled: true, sortOrder: 4, isBuiltin: false },
  });
  console.log("Seed: form fields");

  // ===== 範例預約紀錄 (50筆) =====
  const today = new Date();
  const tzOffset = 8 * 60;
  const local = new Date(today.getTime() + (tzOffset + today.getTimezoneOffset()) * 60000);
  function futureDate(daysFromNow: number) {
    const d = new Date(local.getTime() + daysFromNow * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const allProviderIds = providers.map(p => p.id);
  const allServiceConfigs = [
    { id: "svc-consult", duration: 30 },
    { id: "svc-coaching", duration: 60 },
    { id: "svc-workshop", duration: 90 },
    { id: "svc-therapy", duration: 50 },
    { id: "svc-yoga", duration: 60 },
    { id: "svc-photo", duration: 120 },
  ];
  const statuses = ["confirmed", "confirmed", "confirmed", "completed", "completed", "cancelled", "pending", "on_hold"];
  const names = [
    "張小明", "李美麗", "王大華", "陳志偉", "林雅婷", "黃建國", "吳淑芬", "趙雅琪",
    "周家豪", "鄭心怡", "劉志明", "蔡佳蓉", "許文龍", "謝宗翰", "曾詩涵", "蕭育誠",
    "盧怡君", "葉柏辰", "方雅文", "彭俊傑", "廖婷婷", "賴冠宇", "姚靜怡", "范振宇",
    "邱曉薇", "洪偉倫", "田芷萱", "鍾柏翰", "施佳穎", "沈俊良", "石雨萱", "紀宏達",
    "余曉雯", "宋仁傑", "溫雅惠", "段志豪", "康書瑋", "湯雅琳", "嚴國強", "白若瑜",
  ];
  const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];

  const bookings = [];
  for (let i = 0; i < 50; i++) {
    const dayOffset = Math.floor(i / 5) - 4; // -4 to +6 days
    const svcConfig = allServiceConfigs[i % allServiceConfigs.length];
    const provId = allProviderIds[i % allProviderIds.length];
    const startTime = times[i % times.length];
    const [h, m] = startTime.split(":").map(Number);
    const endMinutes = h * 60 + m + svcConfig.duration;
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
    const name = names[i % names.length];
    const phone = `09${(10000000 + i * 1234567).toString().slice(-8)}`;

    bookings.push({
      providerId: provId,
      serviceId: svcConfig.id,
      lineUserId: `user-${i + 1}`,
      customerName: name,
      customerPhone: phone,
      date: futureDate(dayOffset),
      startTime,
      endTime,
      status: statuses[i % statuses.length],
    });
  }

  for (const b of bookings) {
    await prisma.booking.create({
      data: { ...b, date: new Date(b.date + "T00:00:00+08:00") },
    });
  }
  console.log(`Seed: ${bookings.length} bookings`);

  // ===== 用戶 (40個) =====
  for (let i = 0; i < 40; i++) {
    const name = names[i % names.length];
    const phone = `09${(10000000 + i * 1234567).toString().slice(-8)}`;
    await prisma.customer.upsert({
      where: { lineUserId: `user-${i + 1}` },
      update: {},
      create: {
        lineUserId: `user-${i + 1}`,
        displayName: name,
        phone,
        email: i % 3 === 0 ? `user${i + 1}@example.com` : undefined,
      },
    });
  }
  console.log("Seed: 40 customers");

  // ===== 活動 (4個) =====
  const now = new Date();
  const promotions = [
    {
      id: "promo-1",
      name: "新客體驗送點數",
      description: "首次預約任何服務即送 100 點，歡迎新朋友！",
      serviceIds: null, // 全部服務
      rewardType: "points",
      rewardPoints: 100,
      rewardTickets: 0,
      ticketServiceId: null,
      startDate: new Date(now.getTime() - 7 * 86400000), // 7 天前開始
      endDate: new Date(now.getTime() + 30 * 86400000), // 30 天後結束
      isActive: true,
    },
    {
      id: "promo-2",
      name: "教練課買三送一",
      description: "預約一對一教練課，立即贈送 1 張教練課票券！",
      serviceIds: JSON.stringify(["svc-coaching"]),
      rewardType: "tickets",
      rewardPoints: 0,
      rewardTickets: 1,
      ticketServiceId: "svc-coaching",
      startDate: new Date(now.getTime() - 3 * 86400000),
      endDate: new Date(now.getTime() + 14 * 86400000),
      isActive: true,
    },
    {
      id: "promo-3",
      name: "工作坊雙重回饋",
      description: "報名小班工作坊，同時獲得 50 點 + 1 張諮詢票券",
      serviceIds: JSON.stringify(["svc-workshop"]),
      rewardType: "both",
      rewardPoints: 50,
      rewardTickets: 1,
      ticketServiceId: "svc-consult",
      startDate: new Date(now.getTime() - 1 * 86400000),
      endDate: new Date(now.getTime() + 21 * 86400000),
      isActive: true,
    },
    {
      id: "promo-4",
      name: "瑜伽週年慶（已結束）",
      description: "週年慶特別活動，預約瑜伽課送 200 點",
      serviceIds: JSON.stringify(["svc-yoga"]),
      rewardType: "points",
      rewardPoints: 200,
      rewardTickets: 0,
      ticketServiceId: null,
      startDate: new Date(now.getTime() - 30 * 86400000),
      endDate: new Date(now.getTime() - 1 * 86400000), // 已過期
      isActive: false,
    },
  ];

  for (const p of promotions) {
    await prisma.promotion.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }
  console.log("Seed: 4 promotions (3 active, 1 expired)");

  // 給一些用戶加點數和票券
  const sampleCustomers = await prisma.customer.findMany({ take: 10 });
  for (let i = 0; i < Math.min(sampleCustomers.length, 10); i++) {
    const c = sampleCustomers[i];
    const pts = (i + 1) * 100;
    await prisma.customer.update({ where: { id: c.id }, data: { points: pts } });
    await prisma.pointTransaction.create({
      data: { customerId: c.id, amount: pts, reason: "purchase", notes: "初始儲值" },
    });
    if (i < 5) {
      await prisma.customerTicket.create({
        data: {
          customerId: c.id,
          serviceId: ["svc-consult", "svc-coaching", "svc-workshop", "svc-yoga", "svc-therapy"][i],
          total: 3,
          used: i % 2,
          notes: "範例票券",
        },
      });
    }
  }
  console.log("Seed: customer points (100~1000) + 5 tickets");

  console.log("\n=== Seed 完成 ===");
  console.log("服務: 6 個（諮詢/教練課/工作坊/心理諮商/瑜伽/形象照）");
  console.log("提供者: 8 位");
  console.log("預約: 50 筆");
  console.log("用戶: 40 位（前 10 位有點數，前 5 位有票券）");
  console.log("活動: 4 個（3 個進行中，1 個已結束）");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
