import { prisma } from "./prisma";
import { getFreeBusy } from "./google-calendar";

type TimeSlot = { startTime: string; endTime: string };

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function isoToMinutes(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

export async function getAvailableSlots(
  providerId: string,
  date: string,
  serviceDuration: number
): Promise<TimeSlot[]> {
  const dateObj = new Date(date + "T00:00:00+08:00");
  const dayOfWeek = dateObj.getDay();

  // 1. Get provider's availability for this day of week
  const availabilities = await prisma.availability.findMany({
    where: { providerId, dayOfWeek },
    orderBy: { startTime: "asc" },
  });

  if (availabilities.length === 0) return [];

  // 2. Get existing bookings for this date
  const dayStart = new Date(date + "T00:00:00+08:00");
  const dayEnd = new Date(date + "T23:59:59+08:00");

  const bookings = await prisma.booking.findMany({
    where: {
      providerId,
      date: { gte: dayStart, lte: dayEnd },
      status: "confirmed",
    },
  });

  const bookedSlots = bookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  // 3. Get Google Calendar busy times
  let gcalBusy: { start: number; end: number }[] = [];
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (provider?.googleAccessToken) {
    try {
      const busy = await getFreeBusy(providerId, date);
      gcalBusy = busy.map((b) => ({
        start: isoToMinutes(b.start),
        end: isoToMinutes(b.end),
      }));
    } catch {
      // If Google API fails, continue without it
    }
  }

  const allBusy = [...bookedSlots, ...gcalBusy].sort((a, b) => a.start - b.start);

  // 4. Calculate available slots
  const now = new Date();
  const isToday = date === now.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
  let currentMinutes = 0;
  if (isToday) {
    const taipeiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
    currentMinutes = taipeiNow.getHours() * 60 + taipeiNow.getMinutes();
  }

  const slots: TimeSlot[] = [];

  for (const avail of availabilities) {
    const availStart = timeToMinutes(avail.startTime);
    const availEnd = timeToMinutes(avail.endTime);

    for (let start = availStart; start + serviceDuration <= availEnd; start += 30) {
      const end = start + serviceDuration;

      if (isToday && start <= currentMinutes) continue;

      const hasConflict = allBusy.some(
        (busy) => start < busy.end && end > busy.start
      );
      if (hasConflict) continue;

      slots.push({
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
      });
    }
  }

  return slots;
}

export async function getAvailableDates(
  providerId: string,
  year: number,
  month: number,
  serviceDuration: number
): Promise<string[]> {
  const availabilities = await prisma.availability.findMany({
    where: { providerId },
  });

  const availableDays = new Set(availabilities.map((a) => a.dayOfWeek));
  const dates: string[] = [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    if (dateStr < today) continue;

    const dateObj = new Date(dateStr + "T00:00:00+08:00");
    if (!availableDays.has(dateObj.getDay())) continue;

    dates.push(dateStr);
  }

  return dates;
}
