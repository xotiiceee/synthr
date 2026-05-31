import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

export async function checkBudgetNotifications(
  userId: string,
  budgetId: string,
  categoryId: string,
  period: string,
  amount: number,
  spent: number
) {
  const percentage = amount > 0 ? (spent / amount) * 100 : 0;

  const thresholds = [
    { threshold: 100, label: "exceeded" },
    { threshold: 80, label: "at 80%" },
  ];

  for (const { threshold, label } of thresholds) {
    if (percentage >= threshold) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: NotificationType.BUDGET_ALERT,
          title: `Budget ${label}`,
          message: {
            contains: `${period}`,
          },
        },
      });

      if (!existing) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { name: true },
        });

        await prisma.notification.create({
          data: {
            userId,
            type: NotificationType.BUDGET_ALERT,
            title: `Budget ${label}`,
            message: `Your ${category?.name ?? "category"} budget for ${period} is ${label === "exceeded" ? "over budget" : "at 80%"} ($${spent.toFixed(2)} / $${amount.toFixed(2)}).`,
          },
        });
      }
    }
  }
}
