import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const monthStr = searchParams.get("month") || format(new Date(), "yyyy-MM");
  const [year, month] = monthStr.split("-").map(Number);
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));

  const [expenses, recurringRules, lastMonth] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: token.sub, type: "EXPENSE", date: { gte: start, lte: end } },
      include: { category: true, account: true },
      orderBy: { date: "desc" },
    }),
    prisma.recurringRule.findMany({
      where: { userId: token.sub, type: "EXPENSE", isActive: true },
      orderBy: { amount: "desc" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: token.sub,
        type: "EXPENSE",
        date: { gte: subMonths(start, 1), lt: start },
      },
    }),
  ]);

  const categoryBreakdown = new Map<string, { name: string; total: number; count: number; color?: string }>();
  let totalExpenses = 0;

  for (const e of expenses) {
    const key = e.categoryId || "uncategorized";
    const existing = categoryBreakdown.get(key) || { name: e.category?.name || "Uncategorized", total: 0, count: 0, color: e.category?.color };
    existing.total += Number(e.amount);
    existing.count += 1;
    categoryBreakdown.set(key, existing);
    totalExpenses += Number(e.amount);
  }

  const recurringTotal = recurringRules.reduce((sum, r) => sum + Number(r.amount), 0);
  const lastMonthTotal = Number(lastMonth._sum.amount || 0);

  return NextResponse.json({
    month: monthStr,
    totalExpenses,
    recurringTotal,
    lastMonthTotal,
    change: lastMonthTotal ? ((totalExpenses - lastMonthTotal) / lastMonthTotal) * 100 : 0,
    categoryBreakdown: Array.from(categoryBreakdown.values()).sort((a, b) => b.total - a.total),
    recurringRules: recurringRules.map((r) => ({
      id: r.id,
      name: r.name,
      amount: Number(r.amount),
      frequency: r.frequency,
      nextRun: r.nextRun,
    })),
    transactionCount: expenses.length,
  });
}
