import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = req.nextUrl.searchParams.get("search") || "";
  const serviceId = req.nextUrl.searchParams.get("serviceId") || "";
  const status = req.nextUrl.searchParams.get("status") || "";
  const minBookings = parseInt(req.nextUrl.searchParams.get("minBookings") || "0") || 0;
  const maxBookings = parseInt(req.nextUrl.searchParams.get("maxBookings") || "0") || 0;

  // Build customer filter
  const customerWhere: Record<string, unknown> = {};
  if (search) {
    customerWhere.OR = [
      { displayName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  // Build booking filter for service + status
  const bookingFilter: Record<string, unknown> = {};
  if (serviceId) bookingFilter.serviceId = serviceId;
  if (status) bookingFilter.status = status;

  // If filtering by service or status, get matching lineUserIds
  if (serviceId || status) {
    const matchingBookings = await prisma.booking.findMany({
      where: bookingFilter,
      select: { lineUserId: true },
      distinct: ["lineUserId"],
    });
    const matchedIds = matchingBookings.map((b) => b.lineUserId);
    if (matchedIds.length === 0) {
      return NextResponse.json([]);
    }
    customerWhere.lineUserId = { in: matchedIds };
  }

  const customers = await prisma.customer.findMany({
    where: customerWhere,
    include: {
      tickets: {
        include: { service: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get all bookings for these customers
  const customerLineUserIds = customers.map((c) => c.lineUserId);
  const bookings = await prisma.booking.findMany({
    where: { lineUserId: { in: customerLineUserIds } },
    include: { service: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  });

  // Build stats per customer
  const now = new Date();
  const result = customers.map((customer) => {
    const customerBookings = bookings.filter((b) => b.lineUserId === customer.lineUserId);
    const totalBookings = customerBookings.length;

    // Service counts
    const serviceCounts: Record<string, { id: string; name: string; count: number }> = {};
    for (const b of customerBookings) {
      if (!serviceCounts[b.serviceId]) {
        serviceCounts[b.serviceId] = { id: b.service.id, name: b.service.name, count: 0 };
      }
      serviceCounts[b.serviceId].count++;
    }
    const services = Object.values(serviceCounts).sort((a, b) => b.count - a.count);

    const lastBookingDate = customerBookings.length > 0 ? customerBookings[0].date : null;

    // Active tickets (not expired, has remaining)
    const activeTickets = customer.tickets
      .filter((t) => {
        if (t.expiresAt && new Date(t.expiresAt) < now) return false;
        return t.total - t.used > 0;
      })
      .map((t) => ({
        id: t.id,
        serviceId: t.serviceId,
        serviceName: t.service.name,
        remaining: t.total - t.used,
        total: t.total,
        expiresAt: t.expiresAt,
      }));

    // Strip tickets from spread to avoid dumping all ticket fields
    const { tickets: _tickets, ...customerFields } = customer;
    void _tickets;

    return {
      ...customerFields,
      totalBookings,
      services,
      lastBookingDate,
      activeTickets,
    };
  });

  // Filter by booking count range
  const filtered = result.filter((c) => {
    if (minBookings > 0 && c.totalBookings < minBookings) return false;
    if (maxBookings > 0 && c.totalBookings > maxBookings) return false;
    return true;
  });

  return NextResponse.json(filtered);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, email, phone, notes, isBlocked, blockReason } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
  }

  // Build update data
  const data: Record<string, unknown> = {};
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (notes !== undefined) data.notes = notes;

  // Handle block/unblock
  if (isBlocked === true) {
    data.isBlocked = true;
    data.blockedAt = new Date();
    if (blockReason !== undefined) data.blockReason = blockReason;
  } else if (isBlocked === false) {
    data.isBlocked = false;
    data.blockedAt = null;
    data.blockReason = null;
  }

  const updated = await prisma.customer.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
