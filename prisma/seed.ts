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
      { type: "line", minutesBefore: 1440 },
      { type: "line", minutesBefore: 60 },
    ],
    skipDuplicates: true,
  });
  console.log("Seed: reminder rules");

  // ===== 服務項目 =====
  const services = [
    { id: "svc-consult", name: "線上諮詢", description: "30 分鐘一對一線上諮詢", duration: 30 },
    { id: "svc-coaching", name: "一對一教練課", description: "60 分鐘專屬教練指導", duration: 60 },
    { id: "svc-workshop", name: "小班工作坊", description: "90 分鐘小班制實作課程", duration: 90, assignmentMode: "round_robin" as const },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }
  console.log("Seed: 3 services");

  // ===== 服務提供者 =====
  const providerPassword = await bcrypt.hash("provider123", 10);
  const providers = [
    { id: "prov-amy", name: "Amy Chen", email: "amy@example.com", password: providerPassword },
    { id: "prov-bob", name: "Bob Wang", email: "bob@example.com", password: providerPassword },
    { id: "prov-cathy", name: "Cathy Lin", email: "cathy@example.com", password: providerPassword },
    { id: "prov-david", name: "David Lee", email: "david@example.com", password: providerPassword },
  ];
  for (const p of providers) {
    await prisma.provider.upsert({
      where: { email: p.email },
      update: { password: p.password },
      create: p,
    });
  }
  console.log("Seed: 4 providers (password: provider123)");

  // ===== 服務 <-> 提供者 關聯 =====
  const assignments = [
    // Amy & Bob 做諮詢和教練課
    { providerId: "prov-amy", serviceId: "svc-consult" },
    { providerId: "prov-amy", serviceId: "svc-coaching" },
    { providerId: "prov-bob", serviceId: "svc-consult" },
    { providerId: "prov-bob", serviceId: "svc-coaching" },
    // Cathy & David 做工作坊
    { providerId: "prov-cathy", serviceId: "svc-workshop" },
    { providerId: "prov-david", serviceId: "svc-workshop" },
    // Cathy 也做諮詢
    { providerId: "prov-cathy", serviceId: "svc-consult" },
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
  // Amy: 週一~五 09:00-18:00，中午排除 12:00-13:00
  for (const pId of ["prov-amy", "prov-bob", "prov-cathy", "prov-david"]) {
    // 每天可用
    await prisma.availability.upsert({
      where: { id: `avail-${pId}-everyday` },
      update: {},
      create: {
        id: `avail-${pId}-everyday`,
        providerId: pId,
        dayOfWeek: 7, // every day
        startTime: "09:00",
        endTime: "18:00",
        type: "available",
      },
    });
    // 排除午休
    await prisma.availability.upsert({
      where: { id: `avail-${pId}-lunch` },
      update: {},
      create: {
        id: `avail-${pId}-lunch`,
        providerId: pId,
        dayOfWeek: 7,
        startTime: "12:00",
        endTime: "13:00",
        type: "excluded",
      },
    });
  }
  // Amy 週六也有排班
  await prisma.availability.upsert({
    where: { id: "avail-prov-amy-sat" },
    update: {},
    create: {
      id: "avail-prov-amy-sat",
      providerId: "prov-amy",
      dayOfWeek: 6, // Saturday
      startTime: "10:00",
      endTime: "15:00",
      type: "available",
    },
  });
  console.log("Seed: availability (everyday 9-18, lunch excluded, Amy Sat extra)");

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
  // 工作坊多一個自訂欄位
  await prisma.formField.upsert({
    where: { serviceId_key: { serviceId: "svc-workshop", key: "experience_level" } },
    update: {},
    create: {
      serviceId: "svc-workshop",
      key: "experience_level",
      label: "您的經驗程度",
      type: "radio",
      options: JSON.stringify(["初學者", "有一些基礎", "進階"]),
      required: true,
      enabled: true,
      sortOrder: 4,
      isBuiltin: false,
    },
  });
  console.log("Seed: form fields (+ workshop custom field)");

  // ===== 範例預約紀錄 =====
  const today = new Date();
  const tzOffset = 8 * 60; // UTC+8
  const local = new Date(today.getTime() + (tzOffset + today.getTimezoneOffset()) * 60000);
  const todayStr = local.toISOString().slice(0, 10);

  // 計算未來幾天的日期
  function futureDate(daysFromNow: number) {
    const d = new Date(local.getTime() + daysFromNow * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const bookings = [
    // 今日預約
    { providerId: "prov-amy", serviceId: "svc-consult", lineUserId: "user-1", customerName: "張小明", customerPhone: "0912345678", date: todayStr, startTime: "10:00", endTime: "10:30", status: "confirmed" },
    { providerId: "prov-bob", serviceId: "svc-coaching", lineUserId: "user-2", customerName: "李美麗", customerPhone: "0923456789", date: todayStr, startTime: "14:00", endTime: "15:00", status: "confirmed" },
    { providerId: "prov-amy", serviceId: "svc-consult", lineUserId: "user-3", customerName: "王大華", customerPhone: "0934567890", date: todayStr, startTime: "15:00", endTime: "15:30", status: "confirmed" },
    // 明天
    { providerId: "prov-cathy", serviceId: "svc-workshop", lineUserId: "user-4", customerName: "陳志偉", customerPhone: "0945678901", date: futureDate(1), startTime: "09:00", endTime: "10:30", status: "confirmed" },
    { providerId: "prov-amy", serviceId: "svc-coaching", lineUserId: "user-5", customerName: "林雅婷", customerPhone: "0956789012", date: futureDate(1), startTime: "10:00", endTime: "11:00", status: "confirmed" },
    // 後天
    { providerId: "prov-bob", serviceId: "svc-consult", lineUserId: "user-6", customerName: "黃建國", customerPhone: "0967890123", date: futureDate(2), startTime: "11:00", endTime: "11:30", status: "confirmed" },
    { providerId: "prov-david", serviceId: "svc-workshop", lineUserId: "user-7", customerName: "吳淑芬", customerPhone: "0978901234", date: futureDate(2), startTime: "14:00", endTime: "15:30", status: "confirmed" },
    // 3 天後
    { providerId: "prov-amy", serviceId: "svc-consult", lineUserId: "user-8", customerName: "趙雅琪", customerPhone: "0989012345", date: futureDate(3), startTime: "09:30", endTime: "10:00", status: "confirmed" },
    { providerId: "prov-cathy", serviceId: "svc-consult", lineUserId: "user-9", customerName: "周家豪", customerPhone: "0990123456", date: futureDate(3), startTime: "16:00", endTime: "16:30", status: "confirmed" },
    // 5 天後
    { providerId: "prov-bob", serviceId: "svc-coaching", lineUserId: "user-10", customerName: "鄭心怡", customerPhone: "0911234567", date: futureDate(5), startTime: "10:00", endTime: "11:00", status: "confirmed" },
    // 過去的已完成 & 已取消
    { providerId: "prov-amy", serviceId: "svc-consult", lineUserId: "user-11", customerName: "劉志明", customerPhone: "0922345678", date: futureDate(-1), startTime: "10:00", endTime: "10:30", status: "completed" },
    { providerId: "prov-bob", serviceId: "svc-coaching", lineUserId: "user-12", customerName: "蔡佳蓉", customerPhone: "0933456789", date: futureDate(-2), startTime: "14:00", endTime: "15:00", status: "completed" },
    { providerId: "prov-cathy", serviceId: "svc-workshop", lineUserId: "user-13", customerName: "許文龍", customerPhone: "0944567890", date: futureDate(-1), startTime: "09:00", endTime: "10:30", status: "cancelled" },
  ];

  for (const b of bookings) {
    await prisma.booking.create({
      data: {
        ...b,
        date: new Date(b.date + "T00:00:00+08:00"),
      },
    });
  }
  console.log(`Seed: ${bookings.length} bookings (today + upcoming + past)`);

  console.log("\n=== Seed 完成 ===");
  console.log("服務: 線上諮詢(30m), 一對一教練課(60m), 小班工作坊(90m/輪流指派)");
  console.log("提供者: Amy, Bob, Cathy, David");
  console.log(`預約: ${bookings.length} 筆 (今日3筆, 未來7筆, 過去3筆)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
