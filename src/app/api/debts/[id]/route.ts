import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  balance: z.number().min(0).optional(),
  apr: z.number().min(0).optional(),
  minimumPayment: z.number().positive().optional(),
  payoffStrategy: z.enum(["AVALANCHE", "SNOWBALL"]).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth(req);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.debt.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const debt = await prisma.debt.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.balance !== undefined && { balance: data.balance }),
        ...(data.apr !== undefined && { apr: data.apr }),
        ...(data.minimumPayment !== undefined && { minimumPayment: data.minimumPayment }),
        ...(data.payoffStrategy !== undefined && { payoffStrategy: data.payoffStrategy }),
      },
    });

    return NextResponse.json(debt);
  } catch (error) {
    console.error("Update debt error:", error);
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth(req);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.debt.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await prisma.debt.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
