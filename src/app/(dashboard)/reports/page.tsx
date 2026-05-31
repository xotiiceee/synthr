"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#00d4aa", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];
const glassCard = "relative overflow-hidden border-0 bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export default function ReportsPage() {
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [activeTab, setActiveTab] = useState("spending");
  const chartsRef = useRef<HTMLDivElement>(null);

  const { data: spendingData } = useQuery({
    queryKey: ["reports", "spending-by-category", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/reports/spending-by-category?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch spending data");
      return res.json() as Promise<{ name: string; color?: string | null; total: number }[]>;
    },
    enabled: !!startDate && !!endDate,
  });

  const { data: incomeExpenseData } = useQuery({
    queryKey: ["reports", "income-vs-expense", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/reports/income-vs-expense?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch income/expense data");
      return res.json() as Promise<{ month: string; income: number; expense: number }[]>;
    },
    enabled: !!startDate && !!endDate,
  });

  const { data: netWorthData } = useQuery({
    queryKey: ["reports", "net-worth-history"],
    queryFn: async () => {
      const res = await fetch(`/api/reports/net-worth-history?months=12`);
      if (!res.ok) throw new Error("Failed to fetch net worth data");
      return res.json() as Promise<{ month: string; netWorth: number }[]>;
    },
  });

  const exportCSV = useCallback(() => {
    const rows: Record<string, string | number>[] = [];

    if (spendingData?.length) {
      rows.push({ section: "Spending by Category", category: "", amount: "" });
      for (const item of spendingData) {
        rows.push({ section: "", category: item.name, amount: item.total });
      }
    }

    if (incomeExpenseData?.length) {
      rows.push({ section: "Income vs Expense", category: "", amount: "" });
      for (const item of incomeExpenseData) {
        rows.push({ section: "", category: item.month, amount: `Income: ${item.income}, Expense: ${item.expense}` });
      }
    }

    if (netWorthData?.length) {
      rows.push({ section: "Net Worth History", category: "", amount: "" });
      for (const item of netWorthData) {
        rows.push({ section: "", category: item.month, amount: item.netWorth });
      }
    }

    if (typeof window !== "undefined") {
      import("papaparse").then((Papa) => {
        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `synthr-reports-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  }, [spendingData, incomeExpenseData, netWorthData]);

  const exportPDF = useCallback(async () => {
    if (!chartsRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(chartsRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.setFontSize(16);
    pdf.text("synthr — Financial Reports", 10, 15);
    pdf.setFontSize(10);
    pdf.text(`Date range: ${startDate} to ${endDate}`, 10, 22);

    let yPosition = 30;
    if (imgHeight > pageHeight - 30) {
      const scale = (pageHeight - 40) / imgHeight;
      const finalWidth = imgWidth * scale;
      const finalHeight = imgHeight * scale;
      pdf.addImage(imgData, "PNG", 10, yPosition, finalWidth, finalHeight);
    } else {
      pdf.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);
    }

    pdf.save(`synthr-reports-${new Date().toISOString().split("T")[0]}.pdf`);
  }, [chartsRef, startDate, endDate]);

  const totalSpending = spendingData?.reduce((sum, item) => sum + item.total, 0) ?? 0;

  const currentNetWorth = netWorthData?.[netWorthData.length - 1]?.netWorth ?? 0;
  const startNetWorth = netWorthData?.[0]?.netWorth ?? 0;
  const netWorthChange = currentNetWorth - startNetWorth;
  const netWorthChangePercent = startNetWorth !== 0 ? (netWorthChange / Math.abs(startNetWorth)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Reports</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportPDF}
            className="border-[#00d4aa] text-[#00d4aa] hover:bg-[#00d4aa]/10"
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <Card className={cn(glassCard)}>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-slate-300">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 ring-1 ring-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-slate-300">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 ring-1 ring-white/10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="income-expense">Income vs Expense</TabsTrigger>
          <TabsTrigger value="net-worth">Net Worth</TabsTrigger>
        </TabsList>

        <div ref={chartsRef} className="space-y-6">
          {/* Spending Tab */}
          <TabsContent value="spending" className="space-y-6">
            <Card className={cn(glassCard)}>
              <CardHeader>
                <CardTitle className="text-slate-200">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {spendingData && spendingData.length > 0 ? (
                  <div className="space-y-6">
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={spendingData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={3}
                          dataKey="total"
                          nameKey="name"
                          stroke="none"
                        >
                          {spendingData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color || COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem" }}
                          formatter={(value: any) => formatCurrency(Number(value))}
                        />
                        <Legend wrapperStyle={{ color: "#94a3b8" }} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="space-y-2">
                      {spendingData.map((item, index) => {
                        const percent = totalSpending > 0 ? (item.total / totalSpending) * 100 : 0;
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between rounded-lg bg-slate-900/40 px-4 py-3 ring-1 ring-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                              />
                              <span className="font-medium text-slate-200">{item.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-slate-200">{formatCurrency(item.total)}</div>
                              <div className="text-xs text-slate-400">{percent.toFixed(1)}% of total</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    No spending data for the selected range.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income vs Expense Tab */}
          <TabsContent value="income-expense" className="space-y-6">
            <Card className={cn(glassCard)}>
              <CardHeader>
                <CardTitle className="text-slate-200">Income vs Expense</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeExpenseData && incomeExpenseData.length > 0 ? (
                  <div className="space-y-6">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={incomeExpenseData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="#64748b" tick={{ fill: "#64748b" }} />
                        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#64748b" tick={{ fill: "#64748b" }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem" }}
                          formatter={(value: any) => formatCurrency(Number(value))}
                        />
                        <Legend wrapperStyle={{ color: "#94a3b8" }} />
                        <Bar dataKey="income" fill="#00d4aa" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-slate-400">Month</TableHead>
                            <TableHead className="text-right text-slate-400">Income</TableHead>
                            <TableHead className="text-right text-slate-400">Expenses</TableHead>
                            <TableHead className="text-right text-slate-400">Net</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomeExpenseData.map((item) => {
                            const net = item.income - item.expense;
                            return (
                              <TableRow key={item.month} className="border-white/5">
                                <TableCell className="font-medium text-slate-200">{item.month}</TableCell>
                                <TableCell className="text-right text-emerald-400">{formatCurrency(item.income)}</TableCell>
                                <TableCell className="text-right text-rose-400">{formatCurrency(item.expense)}</TableCell>
                                <TableCell className={cn("text-right font-medium", net >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                  {formatCurrency(net)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    No income/expense data for the selected range.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Net Worth Tab */}
          <TabsContent value="net-worth" className="space-y-6">
            {/* Summary Stats */}
            {netWorthData && netWorthData.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card className={cn(glassCard)}>
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#00d4aa]/10 blur-2xl" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Current Net Worth</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold text-[#00d4aa]">{formatCurrency(currentNetWorth)}</div>
                  </CardContent>
                </Card>
                <Card className={cn(glassCard)}>
                  <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl", netWorthChange >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10")} />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Change from Start</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className={cn("text-2xl font-bold", netWorthChange >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {`${netWorthChange >= 0 ? "+" : ""}${formatCurrency(netWorthChange)}`}
                    </div>
                    <div className={cn("text-sm", netWorthChange >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {`${netWorthChange >= 0 ? "+" : ""}${netWorthChangePercent.toFixed(2)}%`}
                    </div>
                  </CardContent>
                </Card>
                <Card className={cn(glassCard)}>
                  <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-slate-400/10 blur-2xl" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Data Points</CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-2xl font-bold text-slate-200">{netWorthData.length} months</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className={cn(glassCard)}>
              <CardHeader>
                <CardTitle className="text-slate-200">Net Worth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {netWorthData && netWorthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={netWorthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="#64748b" tick={{ fill: "#64748b" }} />
                      <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#64748b" tick={{ fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem" }}
                        formatter={(value: any) => formatCurrency(Number(value))}
                      />
                      <Legend wrapperStyle={{ color: "#94a3b8" }} />
                      <Line
                        type="monotone"
                        dataKey="netWorth"
                        stroke="#00d4aa"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#0f172a", stroke: "#00d4aa", strokeWidth: 2 }}
                        name="Net Worth"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    No net worth data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
