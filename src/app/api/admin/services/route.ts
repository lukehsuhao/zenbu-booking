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
      assignmentMode: body.assignmentMode || "manual",
      requiresApproval: body.requiresApproval ?? false,
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
      isActive: body.isActive,
      assignmentMode: body.assignmentMode || "manual",
      requiresApproval: body.requiresApproval ?? false,
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
