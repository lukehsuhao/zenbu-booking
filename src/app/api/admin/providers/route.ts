import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providers = await prisma.provider.findMany({
    include: { providerServices: { include: { service: true } }, availabilities: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const provider = await prisma.provider.create({
    data: { name: body.name, email: body.email },
  });
  return NextResponse.json(provider, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const provider = await prisma.provider.update({
    where: { id: body.id },
    data: { name: body.name, email: body.email, isActive: body.isActive },
  });
  return NextResponse.json(provider);
}
