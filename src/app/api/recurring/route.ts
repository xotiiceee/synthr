import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.recurringRule.findMany({
    where: { userId: session.user.id },
    orderBy: { nextRun: "asc" },
  });

  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, type, amount, frequency, startDate, accountId, toAccountId, categoryId, description } = body;

  if (!name || !type || typeof amount !== "number" || !frequency || !startDate || !accountId) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (toAccountId) {
    const toAccount = await prisma.account.findFirst({
      where: { id: toAccountId, userId: session.user.id },
    });
    if (!toAccount) {
      return NextResponse.json({ error: "To account not found" }, { status: 404 });
    }
  }

  const start = new Date(startDate);

  const rule = await prisma.recurringRule.create({
    data: {
      name,
      type,
      amount,
      frequency,
      startDate: start,
      nextRun: start,
      accountId,
      toAccountId: toAccountId || null,
      categoryId: categoryId || null,
      userId: session.user.id,
      description: description || null,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
