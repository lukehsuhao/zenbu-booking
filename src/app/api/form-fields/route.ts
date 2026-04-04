import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — returns only enabled fields for LIFF
export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  if (!serviceId) return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });

  const fields = await prisma.formField.findMany({
    where: { serviceId, enabled: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(
    fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      options: f.options ? JSON.parse(f.options) : null,
      required: f.required,
    }))
  );
}
