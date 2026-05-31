import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const session = await auth(request);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Missing date range" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: start, lte: end },
      type: { in: ["INCOME", "EXPENSE"] },
    },
  });

  const monthMap = new Map<string, { month: string; income: number; expense: number }>();

  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(key);
    const amount = toNumber(t.amount);

    if (existing) {
      if (t.type === "INCOME") existing.income += amount;
      if (t.type === "EXPENSE") existing.expense += amount;
    } else {
      monthMap.set(key, {
        month: key,
        income: t.type === "INCOME" ? amount : 0,
        expense: t.type === "EXPENSE" ? amount : 0,
      });
    }
  }

  const result = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return NextResponse.json(result);
}
