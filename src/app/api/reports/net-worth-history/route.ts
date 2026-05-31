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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthsBack = parseInt(searchParams.get("months") ?? "12", 10);

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
  });

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
  });

  const now = new Date();
  const points: { month: string; netWorth: number }[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    let netWorth = 0;

    for (const account of accounts) {
      const currentBalance = toNumber(account.balance);
      let balanceAtDate = currentBalance;

      for (const t of transactions) {
        if (new Date(t.date) <= monthEnd) continue;

        const amount = toNumber(t.amount);
        if (t.accountId === account.id) {
          if (t.type === "INCOME") balanceAtDate -= amount;
          else if (t.type === "EXPENSE") balanceAtDate += amount;
          else if (t.type === "TRANSFER") balanceAtDate += amount;
        }
        if (t.toAccountId === account.id) {
          if (t.type === "TRANSFER") balanceAtDate -= amount;
        }
      }

      netWorth += balanceAtDate;
    }

    points.push({ month: monthKey, netWorth: Math.round(netWorth * 100) / 100 });
  }

  return NextResponse.json(points);
}
