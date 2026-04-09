import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_BUILTIN_FIELDS = [
  { key: "name", label: "姓名", type: "text", required: true, enabled: true, sortOrder: 0 },
  { key: "email", label: "Email", type: "text", required: false, enabled: true, sortOrder: 1 },
  { key: "phone", label: "電話", type: "text", required: false, enabled: false, sortOrder: 2 },
  { key: "notes", label: "備註", type: "textarea", required: false, enabled: true, sortOrder: 3 },
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      providerServices: {
        include: { provider: { select: { id: true, name: true } } },
      },
    },
  });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const service = await prisma.service.create({
    data: {
      name: body.name,
      description: body.description || null,
      duration: body.duration,
      bufferBefore: body.bufferBefore ?? 0,
      bufferAfter: body.bufferAfter ?? 0,
      slotInterval: body.slotInterval ?? 30,
      bookingWindowDays: body.bookingWindowDays ?? 14,
      minAdvanceDays: body.minAdvanceDays ?? 0,
      assignmentMode: body.assignmentMode || "manual",
      showProviderSelection: body.showProviderSelection ?? false,
      hasDisclaimer: body.hasDisclaimer ?? false,
      disclaimerText: body.disclaimerText ?? null,
      requiresApproval: body.requiresApproval ?? false,
      approvalMessageLine: body.approvalMessageLine ?? null,
      approvalMessageEmail: body.approvalMessageEmail ?? null,
      rejectionMessageLine: body.rejectionMessageLine ?? null,
      rejectionMessageEmail: body.rejectionMessageEmail ?? null,
      approvalNotifyLine: body.approvalNotifyLine ?? true,
      approvalNotifyEmail: body.approvalNotifyEmail ?? false,
      rejectionNotifyLine: body.rejectionNotifyLine ?? true,
      rejectionNotifyEmail: body.rejectionNotifyEmail ?? false,
      bookingConfirmMessage: body.bookingConfirmMessage ?? null,
      bookingConfirmProviderMsg: body.bookingConfirmProviderMsg ?? null,
      notifyAdminOnBooking: body.notifyAdminOnBooking ?? false,
      adminBookingMessage: body.adminBookingMessage ?? null,
      rescheduleCustomerMsg: body.rescheduleCustomerMsg ?? null,
      rescheduleProviderMsg: body.rescheduleProviderMsg ?? null,
      rescheduleAdminMsg: body.rescheduleAdminMsg ?? null,
      cancelCustomerMsg: body.cancelCustomerMsg ?? null,
      cancelProviderMsg: body.cancelProviderMsg ?? null,
      cancelAdminMsg: body.cancelAdminMsg ?? null,
      price: body.price ?? 0,
      acceptTicket: body.acceptTicket ?? false,
      acceptPoints: body.acceptPoints ?? false,
      pointsPerUnit: body.pointsPerUnit ?? 1,
    },
  });

  // Create provider-service associations
  const providerIds: string[] = body.providerIds || [];
  if (providerIds.length > 0) {
    await prisma.providerService.createMany({
      data: providerIds.map((pid: string) => ({ providerId: pid, serviceId: service.id })),
    });
  }

  // Auto-create default form fields for the new service
  await prisma.formField.createMany({
    data: DEFAULT_BUILTIN_FIELDS.map((f) => ({
      ...f,
      serviceId: service.id,
      isBuiltin: true,
    })),
  });

  return NextResponse.json(service, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const service = await prisma.service.update({
    where: { id: body.id },
    data: {
      name: body.name,
      description: body.description || null,
      duration: body.duration,
      bufferBefore: body.bufferBefore ?? undefined,
      bufferAfter: body.bufferAfter ?? undefined,
      slotInterval: body.slotInterval ?? undefined,
      bookingWindowDays: body.bookingWindowDays ?? undefined,
      minAdvanceDays: body.minAdvanceDays ?? undefined,
      isActive: body.isActive,
      assignmentMode: body.assignmentMode || "manual",
      showProviderSelection: body.showProviderSelection ?? undefined,
      hasDisclaimer: body.hasDisclaimer ?? undefined,
      disclaimerText: body.disclaimerText ?? undefined,
      requiresApproval: body.requiresApproval ?? false,
      approvalMessageLine: body.approvalMessageLine ?? undefined,
      approvalMessageEmail: body.approvalMessageEmail ?? undefined,
      rejectionMessageLine: body.rejectionMessageLine ?? undefined,
      rejectionMessageEmail: body.rejectionMessageEmail ?? undefined,
      approvalNotifyLine: body.approvalNotifyLine ?? undefined,
      approvalNotifyEmail: body.approvalNotifyEmail ?? undefined,
      rejectionNotifyLine: body.rejectionNotifyLine ?? undefined,
      rejectionNotifyEmail: body.rejectionNotifyEmail ?? undefined,
      bookingConfirmMessage: body.bookingConfirmMessage ?? undefined,
      bookingConfirmProviderMsg: body.bookingConfirmProviderMsg ?? undefined,
      notifyAdminOnBooking: body.notifyAdminOnBooking ?? undefined,
      adminBookingMessage: body.adminBookingMessage ?? undefined,
      rescheduleCustomerMsg: body.rescheduleCustomerMsg ?? undefined,
      rescheduleProviderMsg: body.rescheduleProviderMsg ?? undefined,
      rescheduleAdminMsg: body.rescheduleAdminMsg ?? undefined,
      cancelCustomerMsg: body.cancelCustomerMsg ?? undefined,
      cancelProviderMsg: body.cancelProviderMsg ?? undefined,
      cancelAdminMsg: body.cancelAdminMsg ?? undefined,
      price: body.price ?? undefined,
      acceptTicket: body.acceptTicket ?? undefined,
      acceptPoints: body.acceptPoints ?? undefined,
      pointsPerUnit: body.pointsPerUnit ?? undefined,
    },
  });

  // Sync provider-service associations
  if (Array.isArray(body.providerIds)) {
    const providerIds: string[] = body.providerIds;
    // Delete removed associations
    await prisma.providerService.deleteMany({
      where: { serviceId: body.id, providerId: { notIn: providerIds } },
    });
    // Add new associations (upsert-like via skipDuplicates)
    if (providerIds.length > 0) {
      await prisma.providerService.createMany({
        data: providerIds.map((pid: string) => ({ providerId: pid, serviceId: body.id })),
        skipDuplicates: true,
      });
    }
  }

  return NextResponse.json(service);
}
