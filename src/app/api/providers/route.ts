import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("serviceId");

  const where: Record<string, unknown> = { isActive: true };
  if (serviceId) {
    where.providerServices = { some: { serviceId } };
  }

  const providers = await prisma.provider.findMany({
    where,
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(providers);
}
