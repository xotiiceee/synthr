"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight, TrendingDown, Receipt, Repeat, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

function getMonthLabel(date: Date) {
  return format(date, "MMMM yyyy");
}

function getMonthParam(date: Date) {
  return format(date, "yyyy-MM");
}

export default function MonthlyExpensesPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["monthly-expenses", getMonthParam(currentMonth)],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-expenses?month=${getMonthParam(currentMonth)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Monthly Expenses</h1>
          <p className="text-zinc-400">Track where your money goes each month</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-40 text-center font-semibold">{getMonthLabel(currentMonth)}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">Loading...</div>
      ) : !data ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">No data available</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-white/5 bg-zinc-900 rounded-xl border-t-2 border-t-rose-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-rose-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-400">{formatCurrency(data.totalExpenses)}</div>
                <p className="text-xs text-zinc-400">{data.transactionCount} transactions</p>
              </CardContent>
            </Card>

            <Card className="border border-white/5 bg-zinc-900 rounded-xl border-t-2 border-t-amber-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recurring Bills</CardTitle>
                <Repeat className="h-4 w-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">{formatCurrency(data.recurringTotal)}</div>
                <p className="text-xs text-zinc-400">{data.recurringRules.length} active bills</p>
              </CardContent>
            </Card>

            <Card className="border border-white/5 bg-zinc-900 rounded-xl border-t-2 border-t-emerald-400">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">One-Time Spending</CardTitle>
                <Receipt className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(data.totalExpenses - data.recurringTotal)}
                </div>
                <p className="text-xs text-zinc-400">non-recurring</p>
              </CardContent>
            </Card>

            <Card className={`border border-white/5 bg-zinc-900 rounded-xl border-t-2 ${data.change > 0 ? "border-t-red-400" : "border-t-green-400"}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">vs Last Month</CardTitle>
                <Clock className="h-4 w-4 text-zinc-400" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center gap-1 ${data.change > 0 ? "text-red-400" : "text-green-400"}`}>
                  {data.change > 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                  {Math.abs(data.change).toFixed(1)}%
                </div>
                <p className="text-xs text-zinc-400">from {formatCurrency(data.lastMonthTotal)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-white/5 bg-zinc-900 rounded-xl">
              <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
              <CardContent>
                {data.categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-zinc-400">No expenses this month</p>
                ) : (
                  <div className="space-y-3">
                    {data.categoryBreakdown.map((cat: { name: string; total: number; count: number; color?: string }) => {
                      const pct = data.totalExpenses > 0 ? (cat.total / data.totalExpenses) * 100 : 0;
                      return (
                        <div key={cat.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || "#00d4aa" }} />
                              {cat.name}
                            </span>
                            <span className="font-medium">{formatCurrency(cat.total)}</span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: cat.color || "#00d4aa" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-white/5 bg-zinc-900 rounded-xl">
              <CardHeader><CardTitle>Recurring Bills</CardTitle></CardHeader>
              <CardContent>
                {data.recurringRules.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-zinc-400">No recurring bills set up</p>
                    <p className="text-xs text-zinc-400 mt-1">Add recurring transactions to track your monthly bills</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recurringRules.map((rule: { id: string; name: string; amount: number; frequency: string; nextRun: string }) => (
                      <div key={rule.id} className="flex items-center justify-between rounded-lg border border-white/5 p-3 hover:bg-white/5 transition-colors">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-4">{rule.frequency}</Badge>
                            <span className="text-xs text-zinc-400">Next: {format(new Date(rule.nextRun), "MMM d")}</span>
                          </div>
                        </div>
                        <span className="font-bold text-amber-400">{formatCurrency(rule.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
