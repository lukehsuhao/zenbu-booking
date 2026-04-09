import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      providerServices: { include: { service: { select: { id: true, name: true } } } },
    },
  });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Provider can only view their own profile (unless admin)
  const user = session.user as { role?: string; providerId?: string };
  if (user.role !== "admin" && user.providerId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Strip sensitive fields
  const { googleAccessToken, googleRefreshToken, password, ...safe } = provider;
  return NextResponse.json(safe);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as { role?: string; providerId?: string };

  // Provider can only edit their own profile
  if (user.role !== "admin" && user.providerId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  try {
    const provider = await prisma.provider.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        ...(user.role === "admin" && typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        ...(body.password ? { password: await bcrypt.hash(body.password, 10) } : {}),
        ...(body.googleDisconnect ? { googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null, calendarId: null } : {}),
        ...(body.lineDisconnect ? { lineUserId: null, lineLinkCode: null } : {}),
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
