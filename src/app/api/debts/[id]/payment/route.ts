import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.number().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { amount } = paymentSchema.parse(body);

    const debt = await prisma.debt.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!debt) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const newBalance = Math.max(0, Number(debt.balance) - amount);

    const updated = await prisma.debt.update({
      where: { id },
      data: { balance: newBalance },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Debt payment error:", error);
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
