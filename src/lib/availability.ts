import { prisma } from "./prisma";
import { getFreeBusy } from "./google-calendar";

type TimeSlot = { startTime: string; endTime: string; booked?: boolean };

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

  // Exclusions (lunch breaks etc) — these time ranges are not offered at all
  const excludedRanges = activeExclusions.map((e) => ({
    start: timeToMinutes(e.startTime),
    end: timeToMinutes(e.endTime),
  }));

  // Taken ranges (bookings + Google Calendar) — shown crossed out, not hidden
  const takenRanges = [...bookedSlots, ...gcalBusy];

  // 4. Calculate available slots
  const now = new Date();
  const isToday = date === now.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
  let currentMinutes = 0;
  if (isToday) {
    const taipeiNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
    currentMinutes = taipeiNow.getHours() * 60 + taipeiNow.getMinutes();
  }

  // Use a Map to dedupe by startTime (in case availabilities overlap)
  const slotMap = new Map<string, TimeSlot>();

  for (const avail of availabilities) {
    const availStart = timeToMinutes(avail.startTime);
    const availEnd = timeToMinutes(avail.endTime);

    for (let start = availStart; start + serviceDuration <= availEnd; start += slotInterval) {
      const end = start + serviceDuration;

      // Past time slots: hide entirely
      if (isToday && start <= currentMinutes) continue;

      // Check with service buffer applied
      const effectiveStart = start - serviceBufferBefore;
      const effectiveEnd = end + serviceBufferAfter;

      // Exclusions: time not offered (e.g. lunch break) — hide entirely
      const isExcluded = excludedRanges.some(
        (ex) => effectiveStart < ex.end && effectiveEnd > ex.start
      );
      if (isExcluded) continue;

      // Bookings / gcal conflicts: show crossed out so users see they were taken
      const isTaken = takenRanges.some(
        (busy) => effectiveStart < busy.end && effectiveEnd > busy.start
      );

      const startStr = minutesToTime(start);
      const existing = slotMap.get(startStr);
      // Prefer "free" over "taken" if the same slot appears in overlapping availabilities
      if (!existing || (existing.booked && !isTaken)) {
        slotMap.set(startStr, {
          startTime: startStr,
          endTime: minutesToTime(end),
          booked: isTaken,
        });
      }
    }
  }

  // Return sorted by start time
  return Array.from(slotMap.values()).sort((a, b) =>
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
}

export async function getAvailableDates(
  providerId: string,
  year: number,
  month: number,
  serviceDuration: number,
  serviceBufferBefore: number = 0,
  serviceBufferAfter: number = 0,
  slotInterval: number = 30
): Promise<string[]> {
  // 1. Fetch provider's availability schedule (once)
  const allAvailabilities = await prisma.availability.findMany({
    where: { providerId },
  });

  const availabilitiesByDay = new Map<number, typeof allAvailabilities>();
  const exclusionsByDay = new Map<number, typeof allAvailabilities>();
  const specificDateExclusions = new Map<string, typeof allAvailabilities>();

  for (const a of allAvailabilities) {
    const type = a.type || "available";
    if (type === "available") {
      if (!availabilitiesByDay.has(a.dayOfWeek)) availabilitiesByDay.set(a.dayOfWeek, []);
      availabilitiesByDay.get(a.dayOfWeek)!.push(a);
    } else if (type === "excluded") {
      if (a.specificDate) {
        if (!specificDateExclusions.has(a.specificDate)) specificDateExclusions.set(a.specificDate, []);
        specificDateExclusions.get(a.specificDate)!.push(a);
      } else {
        if (!exclusionsByDay.has(a.dayOfWeek)) exclusionsByDay.set(a.dayOfWeek, []);
        exclusionsByDay.get(a.dayOfWeek)!.push(a);
      }
    }
  }

  // 2. Fetch all confirmed bookings for this provider in the month (Taipei timezone)
  const monthStartStr = `${year}-${month.toString().padStart(2, "0")}-01T00:00:00+08:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEndStr = `${year}-${month.toString().padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}T23:59:59+08:00`;
  const bookings = await prisma.booking.findMany({
    where: {
      providerId,
      date: { gte: new Date(monthStartStr), lte: new Date(monthEndStr) },
      status: "confirmed",
    },
  });

  // Group bookings by Taipei-local date string (NOT UTC ISO date)
  const bookingsByDate = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const key = b.date.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
    if (!bookingsByDate.has(key)) bookingsByDate.set(key, []);
    bookingsByDate.get(key)!.push(b);
  }

  // 3. Check each day in the month
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
  const nowInTaipei = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const currentMinutes = nowInTaipei.getHours() * 60 + nowInTaipei.getMinutes();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    if (dateStr < today) continue;

    const dateObj = new Date(dateStr + "T00:00:00+08:00");
    const dow = dateObj.getDay();

    // Collect applicable availabilities (day of week OR "every day" = 7)
    const dayAvails = [
      ...(availabilitiesByDay.get(dow) || []),
      ...(availabilitiesByDay.get(7) || []),
    ];
    if (dayAvails.length === 0) continue;

    // Collect applicable exclusions
    const dayExclusions = [
      ...(exclusionsByDay.get(dow) || []),
      ...(exclusionsByDay.get(7) || []),
      ...(specificDateExclusions.get(dateStr) || []),
    ];

    // Build busy ranges: bookings (with buffer) + exclusions
    const dayBookings = bookingsByDate.get(dateStr) || [];
    const busy: { start: number; end: number }[] = [];
    for (const b of dayBookings) {
      const s = timeToMinutes(b.startTime) - serviceBufferBefore;
      const e = timeToMinutes(b.endTime) + serviceBufferAfter;
      busy.push({ start: s, end: e });
    }
    for (const ex of dayExclusions) {
      busy.push({ start: timeToMinutes(ex.startTime), end: timeToMinutes(ex.endTime) });
    }

    const isToday = dateStr === today;

    // Check if any slot is available
    let hasAnySlot = false;
    for (const avail of dayAvails) {
      const availStart = timeToMinutes(avail.startTime);
      const availEnd = timeToMinutes(avail.endTime);
      for (let start = availStart; start + serviceDuration <= availEnd; start += slotInterval) {
        if (isToday && start <= currentMinutes) continue;
        const end = start + serviceDuration;
        const effectiveStart = start - serviceBufferBefore;
        const effectiveEnd = end + serviceBufferAfter;
        const hasConflict = busy.some((b) => effectiveStart < b.end && effectiveEnd > b.start);
        if (!hasConflict) {
          hasAnySlot = true;
          break;
        }
      }
      if (hasAnySlot) break;
    }

    if (hasAnySlot) dates.push(dateStr);
  }

  return dates;
}
