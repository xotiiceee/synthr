import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  balance: z.number().min(0),
  apr: z.number().min(0),
  minimumPayment: z.number().positive(),
  payoffStrategy: z.enum(["AVALANCHE", "SNOWBALL"]).default("AVALANCHE"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const debts = await prisma.debt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(debts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const debt = await prisma.debt.create({
      data: {
        name: data.name,
        type: data.type,
        balance: data.balance,
        apr: data.apr,
        minimumPayment: data.minimumPayment,
        payoffStrategy: data.payoffStrategy,
        userId: session.user.id,
      },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (error) {
    console.error("Create debt error:", error);
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
