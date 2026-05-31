import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkBudgetNotifications } from "@/lib/notifications";

const budgetSchema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  rollover: z.boolean().default(false),
});

function getMonthBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ message: "Invalid period" }, { status: 400 });
  }

  const { start, end } = getMonthBounds(period);

  const budgets = await prisma.budget.findMany({
    where: {
      userId: session.user.id,
      period,
    },
    include: {
      category: true,
    },
  });

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (budget) => {
      const spentResult = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId: session.user.id,
          categoryId: budget.categoryId,
          type: "EXPENSE",
          date: {
            gte: start,
            lt: end,
          },
        },
      });

      const spent = Number(spentResult._sum.amount ?? 0);

      return {
        ...budget,
        spent,
        remaining: Number(budget.amount) - spent,
      };
    })
  );

  return NextResponse.json({ budgets: budgetsWithSpent });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = budgetSchema.parse(body);

    const { start, end } = getMonthBounds(data.period);

    const spentResult = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: session.user.id,
        categoryId: data.categoryId,
        type: "EXPENSE",
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    const spent = Number(spentResult._sum.amount ?? 0);

    const budget = await prisma.budget.upsert({
      where: {
        categoryId_period: {
          categoryId: data.categoryId,
          period: data.period,
        },
      },
      update: {
        amount: data.amount,
        rollover: data.rollover,
      },
      create: {
        amount: data.amount,
        period: data.period,
        rollover: data.rollover,
        categoryId: data.categoryId,
        userId: session.user.id,
      },
      include: {
        category: true,
      },
    });

    await checkBudgetNotifications(
      session.user.id,
      budget.id,
      budget.categoryId,
      data.period,
      data.amount,
      spent
    );

    return NextResponse.json({
      budget: {
        ...budget,
        spent,
        remaining: Number(budget.amount) - spent,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create budget" }, { status: 500 });
  }
}
