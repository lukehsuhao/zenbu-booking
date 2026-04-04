import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_BUILTIN_FIELDS = [
  { key: "name", label: "姓名", type: "text", required: true, enabled: true, sortOrder: 0 },
  { key: "email", label: "Email", type: "text", required: false, enabled: true, sortOrder: 1 },
  { key: "phone", label: "電話", type: "text", required: false, enabled: false, sortOrder: 2 },
  { key: "notes", label: "備註", type: "textarea", required: false, enabled: true, sortOrder: 3 },
];

async function ensureDefaultFields(serviceId: string) {
  const count = await prisma.formField.count({ where: { serviceId } });
  if (count === 0) {
    await prisma.formField.createMany({
      data: DEFAULT_BUILTIN_FIELDS.map((f) => ({
        ...f,
        serviceId,
        isBuiltin: true,
      })),
    });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceId = req.nextUrl.searchParams.get("serviceId");
  if (!serviceId) return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });

  await ensureDefaultFields(serviceId);

  const fields = await prisma.formField.findMany({
    where: { serviceId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(
    fields.map((f) => ({
      ...f,
      options: f.options ? JSON.parse(f.options) : null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const serviceId = body.serviceId;
  if (!serviceId) return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });

  const maxOrder = await prisma.formField.aggregate({
    where: { serviceId },
    _max: { sortOrder: true },
  });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const field = await prisma.formField.create({
    data: {
      serviceId,
      key: `custom_${Date.now()}`,
      label: body.label,
      type: body.type,
      options: body.options ? JSON.stringify(body.options) : null,
      required: body.required ?? false,
      enabled: true,
      sortOrder: nextOrder,
      isBuiltin: false,
    },
  });

  return NextResponse.json({ ...field, options: field.options ? JSON.parse(field.options) : null }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.fields && Array.isArray(body.fields)) {
    // Batch update all fields (enable/disable, required, sort order)
    for (const f of body.fields) {
      const data: Record<string, unknown> = {};
      if (typeof f.enabled === "boolean") data.enabled = f.enabled;
      if (typeof f.required === "boolean") data.required = f.required;
      if (typeof f.sortOrder === "number") data.sortOrder = f.sortOrder;
      if (typeof f.label === "string") data.label = f.label;
      if (f.options !== undefined) data.options = f.options ? JSON.stringify(f.options) : null;

      await prisma.formField.update({ where: { id: f.id }, data });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid body" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const field = await prisma.formField.findUnique({ where: { id } });
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (field.isBuiltin) return NextResponse.json({ error: "Cannot delete builtin field" }, { status: 400 });

  await prisma.formField.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
