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
  serviceDuration: number,
  serviceBufferBefore: number = 0,
  serviceBufferAfter: number = 0,
  slotInterval: number = 30
): Promise<TimeSlot[]> {
  const dateObj = new Date(date + "T00:00:00+08:00");
  const dayOfWeek = dateObj.getDay();

  // 1. Get provider's availability: match day of week OR "every day" (7)
  const allAvailabilities = await prisma.availability.findMany({
    where: {
      providerId,
      dayOfWeek: { in: [dayOfWeek, 7] },
    },
    orderBy: { startTime: "asc" },
  });

  // Separate into available and excluded
  const availabilities = allAvailabilities.filter((a) => a.type === "available" || !a.type);
  const exclusions = allAvailabilities.filter((a) => a.type === "excluded");

  // Filter exclusions: if specificDate is set, only apply when it matches
  const activeExclusions = exclusions.filter((e) => {
    if (e.specificDate) return e.specificDate === date;
    return true; // no specificDate means applies every matching day
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

  // Expand booked slots with service buffer (from the Service model)
  const bookedSlots = bookings.map((b) => {
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    return {
      start: bStart - serviceBufferBefore,
      end: bEnd + serviceBufferAfter,
    };
  });

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

  // Build excluded time ranges
  const excludedRanges = activeExclusions.map((e) => ({
    start: timeToMinutes(e.startTime),
    end: timeToMinutes(e.endTime),
  }));

  const allBusy = [...bookedSlots, ...gcalBusy, ...excludedRanges].sort(
    (a, b) => a.start - b.start
  );

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

    for (let start = availStart; start + serviceDuration <= availEnd; start += slotInterval) {
      const end = start + serviceDuration;

      if (isToday && start <= currentMinutes) continue;

      // Check with service buffer applied
      const effectiveStart = start - serviceBufferBefore;
      const effectiveEnd = end + serviceBufferAfter;

      const hasConflict = allBusy.some(
        (busy) => effectiveStart < busy.end && effectiveEnd > busy.start
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

  // Only consider "available" type slots for date listing
  const availableOnly = availabilities.filter((a) => a.type === "available" || !a.type);
  const availableDays = new Set(availableOnly.map((a) => a.dayOfWeek));
  const hasEveryDay = availableDays.has(7);

  const dates: string[] = [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    if (dateStr < today) continue;

    const dateObj = new Date(dateStr + "T00:00:00+08:00");
    const dow = dateObj.getDay();
    if (!hasEveryDay && !availableDays.has(dow)) continue;

    dates.push(dateStr);
  }

  return dates;
}
