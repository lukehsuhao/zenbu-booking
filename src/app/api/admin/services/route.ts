import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const services = await prisma.service.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const service = await prisma.service.create({
    data: {
      name: body.name,
      description: body.description || null,
      duration: body.duration,
    },
  });
  return NextResponse.json(service, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const service = await prisma.service.update({
    where: { id: body.id },
    data: {
      name: body.name,
      description: body.description || null,
      duration: body.duration,
      isActive: body.isActive,
    },
  });
  return NextResponse.json(service);
}
