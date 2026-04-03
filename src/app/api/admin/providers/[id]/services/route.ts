import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { serviceIds } = await req.json();

  await prisma.providerService.deleteMany({ where: { providerId: id } });
  await prisma.providerService.createMany({
    data: serviceIds.map((serviceId: string) => ({ providerId: id, serviceId })),
  });

  return NextResponse.json({ success: true });
}
