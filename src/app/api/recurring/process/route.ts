import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

function advanceDate(date: Date, frequency: string): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(date, 1);
    case "WEEKLY":
      return addWeeks(date, 1);
    case "BIWEEKLY":
      return addWeeks(date, 2);
    case "MONTHLY":
      return addMonths(date, 1);
    case "YEARLY":
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
}

export async function POST(request: NextRequest) {
  // Optional simple token for basic cron protection
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const rules = await prisma.recurringRule.findMany({
    where: {
      isActive: true,
      nextRun: { lte: now },
    },
  });

  const createdTransactions = [];

  for (const rule of rules) {
    let nextRun = rule.nextRun;
    let isActive = rule.isActive;
    let iterations = 0;
    const maxIterations = 24; // safety limit

    while (nextRun <= now && isActive && iterations < maxIterations) {
      iterations++;

      const transaction = await prisma.transaction.create({
        data: {
          type: rule.type,
          amount: rule.amount,
          date: nextRun,
          description: rule.description || rule.name,
          source: "RECURRING",
          isRecurring: true,
          accountId: rule.accountId,
          toAccountId: rule.toAccountId,
          categoryId: rule.categoryId,
          recurringRuleId: rule.id,
          userId: rule.userId,
        },
      });

      createdTransactions.push(transaction);

      // Update account balances
      if (rule.type === "INCOME") {
        await prisma.account.update({
          where: { id: rule.accountId },
          data: { balance: { increment: rule.amount } },
        });
      } else if (rule.type === "EXPENSE") {
        await prisma.account.update({
          where: { id: rule.accountId },
          data: { balance: { decrement: rule.amount } },
        });
      } else if (rule.type === "TRANSFER" && rule.toAccountId) {
        await prisma.account.update({
          where: { id: rule.accountId },
          data: { balance: { decrement: rule.amount } },
        });
        await prisma.account.update({
          where: { id: rule.toAccountId },
          data: { balance: { increment: rule.amount } },
        });
      }

      // Advance nextRun
      nextRun = advanceDate(nextRun, rule.frequency);

      // If endDate is set and nextRun exceeds it, deactivate
      isActive = rule.endDate ? nextRun <= rule.endDate : true;
      if (!isActive) {
        nextRun = rule.endDate ?? nextRun;
      }
    }

    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: { nextRun, isActive },
    });
  }

  return NextResponse.json({ processed: createdTransactions.length, transactions: createdTransactions });
}
