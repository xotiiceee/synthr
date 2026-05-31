import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { calculateBudgetPlan } from "@/lib/budget-planner";
import { generateBudgetPlan } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const plan = await calculateBudgetPlan(token.sub);

    // Try AI enhancement if Gemini key is configured
    let aiPlan = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const recentTransactions = await prisma.transaction.findMany({
          where: { userId: token.sub },
          include: { category: true },
          orderBy: { date: "desc" },
          take: 50,
        });

        const recurringBills = await prisma.recurringRule.findMany({
          where: { userId: token.sub, type: "EXPENSE", isActive: true },
        });

        const debts = await prisma.debt.findMany({ where: { userId: token.sub } });
        const goals = await prisma.savingsGoal.findMany({ where: { userId: token.sub } });

        const categoryTotals = new Map<string, number>();
        recentTransactions
          .filter((t) => t.type === "EXPENSE")
          .forEach((t) => {
            const cat = t.category?.name || "Other";
            categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Number(t.amount));
          });

        aiPlan = await generateBudgetPlan({
          monthlyIncome: plan.monthlyBreakdown.income,
          monthlyExpenses: plan.monthlyBreakdown.fixedExpenses + plan.monthlyBreakdown.variableExpenses,
          recurringBills: recurringBills.map((r) => ({ name: r.name || "Unknown", amount: Number(r.amount) })),
          categoryBreakdown: [...categoryTotals.entries()].map(([name, total]) => ({ name, total })),
          debts: debts.map((d) => ({ name: d.name, balance: Number(d.balance), apr: Number(d.apr), minimumPayment: Number(d.minimumPayment) })),
          goals: goals.map((g) => ({ name: g.name, targetAmount: Number(g.targetAmount), currentAmount: Number(g.currentAmount) })),
          last30Days: recentTransactions.map((t) => ({
            description: t.description,
            amount: Number(t.amount),
            category: t.category?.name || "Other",
            date: t.date.toISOString(),
          })),
        });
      } catch (e) {
        console.error("AI plan failed, using rule-based:", e);
      }
    }

    return NextResponse.json({ plan, aiPlan });
  } catch (error) {
    console.error("Budget plan error:", error);
    return NextResponse.json({ message: "Failed to generate plan" }, { status: 500 });
  }
}
