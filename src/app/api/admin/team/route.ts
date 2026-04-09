import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.teamMember.findMany({
    select: { id: true, name: true, email: true, lineUserId: true, lineLinkCode: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, password } = body;
  if (!name || !email || !password) return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });

  const existing = await prisma.teamMember.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "此 Email 已被使用" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const member = await prisma.teamMember.create({
    data: { name, email, password: hashed },
    select: { id: true, name: true, email: true, lineUserId: true, lineLinkCode: true },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Disconnect LINE
  if (body.action === "disconnect" && body.id) {
    await prisma.teamMember.update({
      where: { id: body.id },
      data: { lineUserId: null, lineLinkCode: null },
    });
    return NextResponse.json({ success: true });
  }

  // Generate link code for a specific member
  if (body.action === "generateLinkCode" && body.id) {
    const code = `LINK-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    await prisma.teamMember.update({
      where: { id: body.id },
      data: { lineLinkCode: code },
    });
    return NextResponse.json({ code });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { id?: string; role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  if (id === user.id) return NextResponse.json({ error: "不能刪除自己" }, { status: 400 });

  await prisma.teamMember.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
