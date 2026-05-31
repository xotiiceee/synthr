"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
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
import { Download, FileText, FileSpreadsheet } from "lucide-react";

const COLORS = ["#00d4aa", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

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
      // If too tall, scale to fit and add pages
      const scale = (pageHeight - 40) / imgHeight;
      const finalWidth = imgWidth * scale;
      const finalHeight = imgHeight * scale;
      pdf.addImage(imgData, "PNG", 10, yPosition, finalWidth, finalHeight);
    } else {
      pdf.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);
    }

    pdf.save(`synthr-reports-${new Date().toISOString().split("T")[0]}.pdf`);
  }, [chartsRef, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Charts Area */}
      <div ref={chartsRef} className="space-y-6">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingData && spendingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="total"
                    nameKey="name"
                    label={(entry: any) =>
                      `${entry.name}: ${formatCurrency(Number(entry.total))}`
                    }
                  >
                    {spendingData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No spending data for the selected range.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income vs Expense */}
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeExpenseData && incomeExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="income" fill="#00d4aa" />
                  <Bar dataKey="expense" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No income/expense data for the selected range.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Net Worth Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Net Worth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {netWorthData && netWorthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={netWorthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="netWorth"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Net Worth"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No net worth data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
