/**
 * Seed script: fill a service's availability for specific days to simulate fully-booked state.
 *
 * Usage:
 *   npx tsx prisma/seed-bookings.ts
 *
 * This will:
 * 1. Pick the first active service + first provider assigned to it
 * 2. Create bookings that fill all available slots for the next 3 weekdays
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

async function main() {
  console.log("🌱 Seeding sample bookings to simulate fully-booked days...\n");

  // 1. Find the first active service with at least one provider
  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: {
      providerServices: {
        include: { provider: true },
      },
    },
  });

  const serviceWithProvider = services.find((s) => s.providerServices.length > 0);
  if (!serviceWithProvider) {
    console.error("❌ 找不到有提供者的服務");
    process.exit(1);
  }

  const allProviders = serviceWithProvider.providerServices.map((ps) => ps.provider);
  console.log(`📌 使用服務：${serviceWithProvider.name} (時長 ${serviceWithProvider.duration} 分鐘)`);
  console.log(`📌 共 ${allProviders.length} 位提供者：${allProviders.map((p) => p.name).join(", ")}\n`);

  // 2. Fill the next 3 days that match availability — for ALL providers
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysToFill = [3, 4, 5]; // 3, 4, 5 days from now
  const targetDates: Date[] = [];
  for (const offset of daysToFill) {
    targetDates.push(new Date(today.getTime() + offset * 86400000));
  }

  let totalBookingsCreated = 0;

  for (const targetDate of targetDates) {
    const dayOfWeek = targetDate.getDay();
    const dateStr = targetDate.toISOString().slice(0, 10);
    const dayLabel = ["日","一","二","三","四","五","六"][dayOfWeek];
    console.log(`\n📅 ${dateStr} (週${dayLabel})`);

    for (const provider of allProviders) {
      // Get this provider's availability
      const availabilities = await prisma.availability.findMany({
        where: { providerId: provider.id, type: "available" },
      });

      const matchingAvails = availabilities.filter((a) => a.dayOfWeek === dayOfWeek || a.dayOfWeek === 7);
      if (matchingAvails.length === 0) {
        console.log(`  ⏭️  ${provider.name} — 無排班`);
        continue;
      }

      // Delete any existing sample bookings on this date for this provider
      await prisma.booking.deleteMany({
        where: {
          providerId: provider.id,
          date: new Date(dateStr + "T00:00:00+08:00"),
          lineUserId: { startsWith: "sample-" },
        },
      });

      // Generate all slots for this provider on this day
      const slotInterval = serviceWithProvider.slotInterval || 30;
      const slotsToBook: { startTime: string; endTime: string }[] = [];

      for (const avail of matchingAvails) {
        const availStart = timeToMinutes(avail.startTime);
        const availEnd = timeToMinutes(avail.endTime);

        for (let start = availStart; start + serviceWithProvider.duration <= availEnd; start += slotInterval) {
          const end = start + serviceWithProvider.duration;
          slotsToBook.push({
            startTime: minutesToTime(start),
            endTime: minutesToTime(end),
          });
        }
      }

      // Create confirmed bookings for all slots
      let count = 0;
      for (const slot of slotsToBook) {
        await prisma.booking.create({
          data: {
            providerId: provider.id,
            serviceId: serviceWithProvider.id,
            lineUserId: `sample-${provider.id}-${dateStr}-${slot.startTime}`,
            customerName: `範例客戶`,
            customerPhone: "0900-000-000",
            date: new Date(dateStr + "T00:00:00+08:00"),
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: "confirmed",
          },
        });
        count++;
      }
      totalBookingsCreated += count;
      console.log(`  ✅ ${provider.name} — 建立 ${count} 筆預約`);
    }
  }

  console.log(`\n🎉 完成！共建立 ${totalBookingsCreated} 筆範例預約`);
  console.log(`\n提示：所有 lineUserId 以 'sample-' 開頭，可用下列指令清除：`);
  console.log(`  npx tsx -e "import {PrismaClient} from './src/generated/prisma/client'; new PrismaClient().booking.deleteMany({where:{lineUserId:{startsWith:'sample-'}}}).then(r=>console.log(r))"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
