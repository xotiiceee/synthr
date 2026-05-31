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
      type: "EXPENSE",
      categoryId: { not: null },
    },
    include: { category: true },
  });

  const categoryMap = new Map<string, { name: string; color?: string | null; total: number }>();

  for (const t of transactions) {
    const cat = t.category;
    if (!cat) continue;
    const existing = categoryMap.get(cat.id);
    const amount = toNumber(t.amount);
    if (existing) {
      existing.total += amount;
    } else {
      categoryMap.set(cat.id, { name: cat.name, color: cat.color, total: amount });
    }
  }

  const result = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

  return NextResponse.json(result);
}
