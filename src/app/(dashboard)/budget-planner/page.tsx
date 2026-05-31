"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet, PiggyBank, TrendingUp, TrendingDown, Receipt, AlertTriangle,
  CheckCircle2, Lightbulb, Sparkles, Target, Coffee, DollarSign, Calendar,
  BarChart3, ArrowUpRight
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function BudgetPlannerPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["budget-plan"],
    queryFn: async () => {
      const res = await fetch("/api/ai/budget-plan");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const plan = data?.plan;
  const ai = data?.aiPlan;

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-lg">Add some transactions to generate your budget plan</p>
      </div>
    );
  }

  const pieData = [
    { name: "Needs (50%)", value: plan.needs, color: "#00d4aa" },
    { name: "Wants (30%)", value: plan.wants, color: "#f59e0b" },
    { name: "Savings (20%)", value: plan.savings, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget Planner</h1>
          <p className="text-muted-foreground">Your personalized spending plan based on real data</p>
        </div>
        {ai && (
          <Badge className="gap-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            <Sparkles className="h-3 w-3" /> AI Enhanced
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10 border-t-2 border-t-emerald-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{fmt(plan.monthlyBreakdown.income)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10 border-t-2 border-t-amber-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bills & Debt</CardTitle>
            <Receipt className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{fmt(plan.billTotal)}</div>
            <p className="text-xs text-muted-foreground">recurring bills + minimum payments</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10 border-t-2 border-t-[#00d4aa]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safe to Spend</CardTitle>
            <Wallet className="h-4 w-4 text-[#00d4aa]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#00d4aa]">{fmt(plan.safeToSpend)}</div>
            <p className="text-xs text-muted-foreground">after bills, debt, and savings</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10 border-t-2 border-t-purple-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Budget</CardTitle>
            <Coffee className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{fmt(plan.dailyBudget)}</div>
            <p className="text-xs text-muted-foreground">${plan.weeklyBudget}/week</p>
          </CardContent>
        </Card>
      </div>

      {/* 50/30/20 Chart + Monthly Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#00d4aa]" />
              50/30/20 Rule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    formatter={(val: number) => fmt(val)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-400" />
              Monthly Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Income", value: plan.monthlyBreakdown.income, color: "text-emerald-400" },
              { label: "Fixed Expenses", value: plan.monthlyBreakdown.fixedExpenses, color: "text-amber-400" },
              { label: "Variable Expenses", value: plan.monthlyBreakdown.variableExpenses, color: "text-blue-400" },
              { label: "Remaining", value: plan.monthlyBreakdown.remaining, color: "text-[#00d4aa]" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`font-semibold ${item.color}`}>{fmt(item.value)}</span>
              </div>
            ))}
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Recommended Savings</span>
              <span className="font-bold text-[#00d4aa] text-lg">{fmt(plan.recommendedSavings)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {ai && (
        <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10 border border-purple-400/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              AI Insights
              <Badge className="ml-2 bg-purple-400/10 text-purple-400">Gemini</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ai.insights?.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <Lightbulb className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                <span>{s}</span>
              </div>
            ))}
            {ai.suggestions?.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <ArrowUpRight className="h-4 w-4 text-[#00d4aa] mt-0.5 shrink-0" />
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warnings & Suggestions */}
      <div className="grid gap-6 md:grid-cols-2">
        {plan.warnings.length > 0 && (
          <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10 border-l-2 border-l-amber-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.warnings.map((w: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-400 mt-1">•</span>
                    <span className="text-muted-foreground">{w}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10 border-l-2 border-l-[#00d4aa]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#00d4aa]">
              <Lightbulb className="h-5 w-5" />
              Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.suggestions.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#00d4aa] mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
