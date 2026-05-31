import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contributeSchema = z.object({
  amount: z.number().positive(),
});

export async function POST(
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
    const { amount } = contributeSchema.parse(body);

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!goal) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: {
          increment: amount,
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Contribute to savings goal error:", error);
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
