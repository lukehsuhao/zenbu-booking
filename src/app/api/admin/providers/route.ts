import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  try {
    const provider = await prisma.provider.create({
      data: {
        name: body.name,
        email: body.email,
        ...(body.password ? { password: await bcrypt.hash(body.password, 10) } : {}),
      },
    });
    return NextResponse.json(provider, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "此 Email 已被其他提供者使用" }, { status: 409 });
    }
    throw e;
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string; providerId?: string };

  const body = await req.json();

  // Provider can only edit their own profile
  if (user.role !== "admin" && user.providerId !== body.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const provider = await prisma.provider.update({
      where: { id: body.id },
      data: {
        name: body.name,
        email: body.email,
        ...(user.role === "admin" && typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        ...(body.password ? { password: await bcrypt.hash(body.password, 10) } : {}),
      },
    });
    return NextResponse.json(provider);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "此 Email 已被其他提供者使用" }, { status: 409 });
    }
    throw e;
  }
}
