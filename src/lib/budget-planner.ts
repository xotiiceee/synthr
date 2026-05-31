// Rule-based budget planner - works without any external API
import { prisma } from "./prisma";

export interface BudgetPlan {
  safeToSpend: number;
  recommendedSavings: number;
  billTotal: number;
  needs: number;
  wants: number;
  savings: number;
  debtPayoff: number;
  insights: string[];
  warnings: string[];
  suggestions: string[];
  dailyBudget: number;
  weeklyBudget: number;
  monthlyBreakdown: {
    income: number;
    fixedExpenses: number;
    variableExpenses: number;
    remaining: number;
  };
}

export async function calculateBudgetPlan(userId: string): Promise<BudgetPlan> {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

  // Fetch all relevant data
  const [transactions, recurringRules, accounts, debts, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: threeMonthsAgo } },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.recurringRule.findMany({ where: { userId, isActive: true } }),
    prisma.account.findMany({ where: { userId } }),
    prisma.debt.findMany({ where: { userId } }),
    prisma.savingsGoal.findMany({ where: { userId } }),
  ]);

  // Calculate average monthly income
  const monthlyIncomeTransactions = transactions.filter((t) => t.type === "INCOME");
  const months = new Set(monthlyIncomeTransactions.map((t) => `${t.date.getFullYear()}-${t.date.getMonth()}`));
  const totalIncome = monthlyIncomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const avgMonthlyIncome = months.size > 0 ? totalIncome / months.size : 0;

  // Separate fixed vs variable expenses
  const expenseTransactions = transactions.filter((t) => t.type === "EXPENSE");
  const recurringBills = recurringRules.filter((r) => r.type === "EXPENSE");
  const recurringTotal = recurringBills.reduce((sum, r) => sum + Number(r.amount), 0);

  // Variable expenses (average over last 3 months)
  const variableTotal = expenseTransactions
    .filter((t) => {
      const isRecurring = recurringBills.some(
        (r) => r.name && t.description && t.description.toLowerCase().includes(r.name.toLowerCase())
      );
      return !isRecurring;
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const avgVariableMonthly = months.size > 0 ? variableTotal / months.size : 0;

  // Debt minimums
  const debtMinTotal = debts.reduce((sum, d) => sum + Number(d.minimumPayment), 0);

  // Calculate breakdown (50/30/20 rule)
  const totalAvailable = avgMonthlyIncome - recurringTotal - debtMinTotal;
  const needs = Math.round(totalAvailable * 0.5);
  const wants = Math.round(totalAvailable * 0.3);
  const savings = Math.round(totalAvailable * 0.2);

  const insights: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Generate insights
  if (avgMonthlyIncome > 0) {
    const savingsRate = ((avgMonthlyIncome - recurringTotal - avgVariableMonthly) / avgMonthlyIncome) * 100;
    insights.push(`Your current savings rate is ${savingsRate.toFixed(1)}%`);

    if (savingsRate < 20) {
      warnings.push(`Your savings rate (${savingsRate.toFixed(1)}%) is below the recommended 20%`);
      suggestions.push("Try reducing discretionary spending to boost your savings rate");
    }

    // Find top spending category
    const categoryTotals = new Map<string, number>();
    expenseTransactions.forEach((t) => {
      const cat = t.category?.name || "Other";
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Number(t.amount));
    });
    const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      insights.push(`Your top spending category is ${topCategory[0]} at $${(topCategory[1] / months.size).toFixed(0)}/month`);
    }
  }

  // Debt warnings
  const highAprDebts = debts.filter((d) => Number(d.apr) > 15);
  if (highAprDebts.length > 0) {
    warnings.push(`You have ${highAprDebts.length} debt(s) with APR above 15%. Pay these off first.`);
    suggestions.push("Use the avalanche method: pay minimum on all debts, throw extra money at the highest APR first");
  }

  // Goal progress
  const incompleteGoals = goals.filter((g) => Number(g.currentAmount) < Number(g.targetAmount));
  if (incompleteGoals.length > 0) {
    insights.push(`You're working toward ${incompleteGoals.length} savings goals`);
  }

  // Generic useful tips
  suggestions.push("Set up automatic transfers to your savings on payday");
  suggestions.push("Review subscriptions monthly — cancel what you don't use");

  return {
    safeToSpend: Math.round(wants),
    recommendedSavings: Math.round(savings),
    billTotal: Math.round(recurringTotal + debtMinTotal),
    needs,
    wants,
    savings,
    debtPayoff: Math.round(debtMinTotal),
    insights,
    warnings,
    suggestions,
    dailyBudget: Math.round(wants / 30),
    weeklyBudget: Math.round(wants / 4.33),
    monthlyBreakdown: {
      income: Math.round(avgMonthlyIncome),
      fixedExpenses: Math.round(recurringTotal),
      variableExpenses: Math.round(avgVariableMonthly),
      remaining: Math.round(totalAvailable),
    },
  };
}
