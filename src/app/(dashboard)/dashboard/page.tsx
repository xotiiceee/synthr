import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { SpendingBreakdownChart, CashFlowChart } from "./charts";

async function getDashboardData(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
    include: { category: true, account: true },
  });

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const assets = accounts
    .filter((a) => a.type !== "CREDIT" && a.type !== "LOAN")
    .reduce((sum, a) => sum + Number(a.balance), 0);
  const liabilities = accounts
    .filter((a) => a.type === "CREDIT" || a.type === "LOAN")
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startOfMonth },
    },
  });

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    accounts,
    transactions,
    totalBalance,
    netWorth: assets - liabilities,
    monthlyIncome,
    monthlyExpenses,
  };
}

async function getChartData(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [monthlyExpensesWithCategories, halfYearTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: startOfMonth },
      },
      include: { category: true },
    }) as Promise<Array<{ amount: unknown; category: { name: string | null; color: string | null } | null }>>,
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: sixMonthsAgo },
      },
    }) as Promise<Array<{ date: Date | string; type: string; amount: unknown }>>,
  ]);

  const spendingMap = new Map<string, { name: string; color: string; value: number }>();
  for (const t of monthlyExpensesWithCategories) {
    const catName = t.category?.name || "Uncategorized";
    const catColor = t.category?.color || "#00d4aa";
    const existing = spendingMap.get(catName);
    if (existing) {
      existing.value += Number(t.amount);
    } else {
      spendingMap.set(catName, { name: catName, color: catColor, value: Number(t.amount) });
    }
  }
  const spendingByCategory = Array.from(spendingMap.values()).sort((a, b) => b.value - a.value);

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }

  const cashFlow = months.map((m) => {
    const monthTransactions = halfYearTransactions.filter((t) => {
      const tDate = new Date(t.date as string);
      return tDate.getMonth() === m.month && tDate.getFullYear() === m.year;
    });
    const income = monthTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum: number, t) => sum + Number(t.amount), 0);
    const expense = monthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum: number, t) => sum + Number(t.amount), 0);
    return {
      month: m.label,
      income,
      expense,
    };
  });

  return { spendingByCategory, cashFlow };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [data, chartData] = await Promise.all([
    getDashboardData(session.user.id),
    getChartData(session.user.id),
  ]);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const savedThisMonth = data.monthlyIncome - data.monthlyExpenses;

  const currentMonthIndex = chartData.cashFlow.length - 1;
  const lastMonthData =
    currentMonthIndex > 0 ? chartData.cashFlow[currentMonthIndex - 1] : null;
  const lastMonthSaved = lastMonthData
    ? lastMonthData.income - lastMonthData.expense
    : 0;
  const savedTrend = savedThisMonth - lastMonthSaved;

  const totalAbsBalance = (data.accounts as Array<{ balance: unknown }>).reduce(
    (sum: number, a) => sum + Math.abs(Number(a.balance)),
    0
  );

  const cardBase =
    "relative overflow-hidden border-0 bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10";

  return (
    <div className="space-y-8">
      {/* Welcome Bar */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {greeting}, {session.user.name || "there"}
        </h1>
        <p className="text-sm text-slate-400">{today}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Net Worth */}
        <Card className={cn(cardBase, "border-t-2 border-t-teal-500")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-300">
                Net Worth
              </CardTitle>
              <div className="rounded-lg bg-teal-500/10 p-2">
                <Landmark className="h-4 w-4 text-teal-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-bold tracking-tight",
                data.netWorth >= 0 ? "text-white" : "text-rose-400"
              )}
            >
              {formatCurrency(data.netWorth)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {data.netWorth >= 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Positive</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-rose-400" />
                  <span className="text-rose-400">Negative</span>
                </>
              )}
              <span className="text-slate-500">net position</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card className={cn(cardBase, "border-t-2 border-t-emerald-500")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-300">
                Monthly Income
              </CardTitle>
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-white">
              {formatCurrency(data.monthlyIncome)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              This month
            </div>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card className={cn(cardBase, "border-t-2 border-t-rose-500")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-300">
                Monthly Expenses
              </CardTitle>
              <div className="rounded-lg bg-rose-500/10 p-2">
                <TrendingDown className="h-4 w-4 text-rose-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-white">
              {formatCurrency(data.monthlyExpenses)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              This month
            </div>
          </CardContent>
        </Card>

        {/* Saved This Month */}
        <Card className={cn(cardBase, "border-t-2 border-t-teal-400")}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-300">
                Saved This Month
              </CardTitle>
              <div className="rounded-lg bg-teal-500/10 p-2">
                <PiggyBank className="h-4 w-4 text-teal-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-3xl font-bold tracking-tight",
                savedThisMonth >= 0 ? "text-white" : "text-rose-400"
              )}
            >
              {formatCurrency(savedThisMonth)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {savedTrend >= 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">
                    +{formatCurrency(savedTrend)}
                  </span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-rose-400" />
                  <span className="text-rose-400">
                    {formatCurrency(savedTrend)}
                  </span>
                </>
              )}
              <span className="text-slate-500">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={cardBase}>
          <CardHeader>
            <CardTitle className="text-base text-slate-200">
              Spending Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SpendingBreakdownChart data={chartData.spendingByCategory} />
            {chartData.spendingByCategory.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                {chartData.spendingByCategory.slice(0, 6).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color || "#00d4aa" }}
                    />
                    <span className="truncate text-xs text-slate-400">
                      {cat.name}
                    </span>
                    <span className="ml-auto text-xs font-medium text-slate-200">
                      {formatCurrency(cat.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cardBase}>
          <CardHeader>
            <CardTitle className="text-base text-slate-200">
              Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={chartData.cashFlow} />
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-sm bg-[#00d4aa]" />
                <span className="text-xs text-slate-400">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-sm bg-[#f43f5e]" />
                <span className="text-xs text-slate-400">Expenses</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Transactions */}
        <Card className={cardBase}>
          <CardHeader>
            <CardTitle className="text-base text-slate-200">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.transactions.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions yet.</p>
            ) : (
              <div className="space-y-1">
                {(data.transactions as Array<{
                  id: string;
                  type: string;
                  description: string;
                  amount: unknown;
                  date: Date | string;
                  category: { name: string | null } | null;
                }>).map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-white/5"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                        t.type === "INCOME"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      )}
                    >
                      {(t.category?.name || "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {t.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.category?.name || "Uncategorized"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          t.type === "INCOME"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        )}
                      >
                        {t.type === "INCOME" ? "+" : "-"}
                        {formatCurrency(Number(t.amount))}
                      </span>
                      <p className="text-xs text-slate-500">
                        {formatDate(t.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accounts Overview */}
        <Card className={cardBase}>
          <CardHeader>
            <CardTitle className="text-base text-slate-200">
              Accounts Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.accounts.length === 0 ? (
              <p className="text-sm text-slate-500">No accounts found.</p>
            ) : (
              <div className="space-y-5">
                {(data.accounts as Array<{
                  id: string;
                  name: string;
                  type: string;
                  balance: unknown;
                }>).map((a) => {
                  const percentage =
                    totalAbsBalance > 0
                      ? (Math.abs(Number(a.balance)) / totalAbsBalance) * 100
                      : 0;
                  return (
                    <div key={a.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-200">
                            {a.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="border-0 bg-slate-700/50 text-[10px] font-normal text-slate-400"
                          >
                            {a.type.charAt(0) + a.type.slice(1).toLowerCase()}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold text-slate-100">
                          {formatCurrency(Number(a.balance))}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
