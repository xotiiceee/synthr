import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const setupSchema = z.object({
  checkingName: z.string().min(1),
  checkingBalance: z.string(),
  savingsName: z.string().min(1),
  savingsBalance: z.string(),
  incomeFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = setupSchema.parse(body);

    const userId = session.user.id;

    await prisma.$transaction(async (tx) => {
      // Create accounts
      await tx.account.createMany({
        data: [
          {
            name: data.checkingName,
            type: "CHECKING",
            balance: parseFloat(data.checkingBalance) || 0,
            isDefault: true,
            userId,
          },
          {
            name: data.savingsName,
            type: "SAVINGS",
            balance: parseFloat(data.savingsBalance) || 0,
            isDefault: false,
            userId,
          },
        ],
      });

      // Seed default categories
      const defaultCategories = [
        { name: "Salary", type: "INCOME" as const },
        { name: "Freelance", type: "INCOME" as const },
        { name: "Housing", type: "EXPENSE" as const },
        { name: "Utilities", type: "EXPENSE" as const },
        { name: "Groceries", type: "EXPENSE" as const },
        { name: "Transportation", type: "EXPENSE" as const },
        { name: "Dining Out", type: "EXPENSE" as const },
        { name: "Entertainment", type: "EXPENSE" as const },
        { name: "Healthcare", type: "EXPENSE" as const },
        { name: "Subscriptions", type: "EXPENSE" as const },
        { name: "Shopping", type: "EXPENSE" as const },
        { name: "Savings", type: "EXPENSE" as const },
        { name: "Debt Payment", type: "EXPENSE" as const },
      ];

      await tx.category.createMany({
        data: defaultCategories.map((c) => ({ ...c, userId })),
      });

      // Create savings advisor config
      await tx.savingsAdvisor.create({
        data: {
          userId,
          incomeFrequency: data.incomeFrequency,
          targetRate: 0.2,
          fixedExpenses: 0,
        },
      });

      // Mark setup complete
      await tx.user.update({
        where: { id: userId },
        data: { setupComplete: true },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ message: "Setup failed" }, { status: 500 });
  }
}
