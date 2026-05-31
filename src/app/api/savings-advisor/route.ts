import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  incomeFrequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).optional(),
  targetRate: z.number().min(0).max(1).optional(),
  fixedExpenses: z.number().min(0).optional(),
});

function getFrequencyMultiplier(frequency: string) {
  switch (frequency) {
    case "WEEKLY":
      return 4.345;
    case "BIWEEKLY":
      return 2.1725;
    case "DAILY":
      return 30.44;
    case "YEARLY":
      return 1 / 12;
    case "MONTHLY":
    default:
      return 1;
  }
}

function getThreeMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLastMonthRange() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start, end };
}

function estimatePayoffMonths(balance: number, apr: number, minimumPayment: number) {
  const r = apr / 100 / 12;
  if (r <= 0) {
    return balance / minimumPayment;
  }
  if (r * balance >= minimumPayment) {
    return Infinity;
  }
  return -Math.log(1 - (r * balance) / minimumPayment) / Math.log(1 + r);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let advisor = await prisma.savingsAdvisor.findUnique({
    where: { userId },
  });

  if (!advisor) {
    advisor = await prisma.savingsAdvisor.create({
      data: {
        userId,
        incomeFrequency: "MONTHLY",
        targetRate: 0.2,
        fixedExpenses: 0,
      },
    });
  }

  const threeMonthsAgo = getThreeMonthsAgo();
  const { start: lastMonthStart, end: lastMonthEnd } = getLastMonthRange();

  const [
    incomeLast3M,
    expenseLast3M,
    lastMonthIncomeAgg,
    lastMonthExpenseAgg,
    debts,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: threeMonthsAgo },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: threeMonthsAgo },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: lastMonthStart, lt: lastMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.debt.findMany({ where: { userId } }),
  ]);

  const monthlyIncomeAvg = Number(incomeLast3M._sum.amount ?? 0) / 3;
  const monthlyExpenseAvg = Number(expenseLast3M._sum.amount ?? 0) / 3;

  const freqMult = getFrequencyMultiplier(advisor.incomeFrequency);
  const avgIncome = monthlyIncomeAvg / freqMult;

  const totalMinPayments = debts.reduce(
    (sum, d) => sum + Number(d.minimumPayment),
    0
  );
  const fixedExpenses = Number(advisor.fixedExpenses) + totalMinPayments;

  const targetRate = Number(advisor.targetRate);
  const recommendedSavings = avgIncome * targetRate;
  const safeToSpend = Math.max(0, avgIncome - fixedExpenses - recommendedSavings);

  const lastMonthIncome = Number(lastMonthIncomeAgg._sum.amount ?? 0);
  const lastMonthExpenses = Number(lastMonthExpenseAgg._sum.amount ?? 0);
  const actualSavingsRate =
    lastMonthIncome > 0 ? (lastMonthIncome - lastMonthExpenses) / lastMonthIncome : 0;

  let status: "On Track" | "Getting There" | "At Risk" = "At Risk";
  if (actualSavingsRate >= 0.2) status = "On Track";
  else if (actualSavingsRate >= 0.1) status = "Getting There";

  // Allocations
  const highestApr = debts.length > 0 ? Math.max(...debts.map((d) => Number(d.apr))) : 0;
  let debtAllocation = 0;
  let goalsAllocation = 0;
  if (debts.length > 0) {
    const debtRatio = highestApr > 10 ? 0.7 : 0.5;
    debtAllocation = recommendedSavings * debtRatio;
    goalsAllocation = recommendedSavings * (1 - debtRatio);
  } else {
    goalsAllocation = recommendedSavings;
  }

  // Payoff order based on strategy per debt (use the stored strategy on each debt)
  const payoffOrder = debts
    .map((debt) => {
      const months = estimatePayoffMonths(
        Number(debt.balance),
        Number(debt.apr),
        Number(debt.minimumPayment)
      );
      const payoffDate =
        months === Infinity
          ? null
          : new Date();
      if (payoffDate) {
        payoffDate.setMonth(payoffDate.getMonth() + Math.ceil(months));
      }
      return {
        id: debt.id,
        name: debt.name,
        type: debt.type,
        balance: Number(debt.balance),
        apr: Number(debt.apr),
        minimumPayment: Number(debt.minimumPayment),
        payoffStrategy: debt.payoffStrategy,
        estimatedPayoffMonths: months === Infinity ? null : Math.ceil(months),
        estimatedPayoffDate: payoffDate ? payoffDate.toISOString() : null,
      };
    })
    .sort((a, b) => {
      if (a.payoffStrategy === b.payoffStrategy) {
        if (a.payoffStrategy === "AVALANCHE") {
          return b.apr - a.apr;
        }
        return a.balance - b.balance;
      }
      return a.payoffStrategy === "AVALANCHE" ? -1 : 1;
    });

  return NextResponse.json({
    incomeFrequency: advisor.incomeFrequency,
    targetRate: Math.round(targetRate * 10000) / 10000,
    avgIncome: Math.round(avgIncome * 100) / 100,
    fixedExpenses: Math.round(fixedExpenses * 100) / 100,
    variableAvg: Math.round(monthlyExpenseAvg * 100) / 100,
    recommendedSavings: Math.round(recommendedSavings * 100) / 100,
    safeToSpend: Math.round(safeToSpend * 100) / 100,
    actualSavingsRate: Math.round(actualSavingsRate * 10000) / 10000,
    status,
    allocations: {
      debt: Math.round(debtAllocation * 100) / 100,
      goals: Math.round(goalsAllocation * 100) / 100,
    },
    payoffOrder,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const advisor = await prisma.savingsAdvisor.upsert({
      where: { userId },
      create: {
        userId,
        incomeFrequency: data.incomeFrequency ?? "MONTHLY",
        targetRate: data.targetRate ?? 0.2,
        fixedExpenses: data.fixedExpenses ?? 0,
      },
      update: {
        ...(data.incomeFrequency !== undefined && { incomeFrequency: data.incomeFrequency }),
        ...(data.targetRate !== undefined && { targetRate: data.targetRate }),
        ...(data.fixedExpenses !== undefined && { fixedExpenses: data.fixedExpenses }),
      },
    });

    return NextResponse.json(advisor);
  } catch (error) {
    console.error("Update savings advisor error:", error);
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
