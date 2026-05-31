"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, RefreshCw, Briefcase, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  avgCost: number;
  livePrice: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  lastPrice: number;
  lastPriceAt: string | null;
  accountId: string;
  account: { id: string; name: string };
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
}

const COLORS = ["#00d4aa", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1"];

const glassCard = "relative overflow-hidden border-0 bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function InvestmentsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    quantity: "",
    avgCost: "",
    accountId: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: async () => {
      const res = await fetch("/api/investments");
      if (!res.ok) throw new Error("Failed to fetch investments");
      return res.json() as Promise<{
        holdings: Holding[];
        summary: {
          totalMarketValue: number;
          totalCostBasis: number;
          totalUnrealizedGain: number;
          totalUnrealizedGainPercent: number;
        };
      }>;
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      return res.json() as Promise<{ accounts: Account[] }>;
    },
  });

  const accounts = accountsData?.accounts ?? [];

  const createMutation = useMutation({
    mutationFn: async (payload: { symbol: string; quantity: number; avgCost: number; accountId: string }) => {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create holding");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; quantity: number; avgCost: number }) => {
      const res = await fetch(`/api/investments/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: payload.quantity, avgCost: payload.avgCost }),
      });
      if (!res.ok) throw new Error("Failed to update holding");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      setDialogOpen(false);
      setEditingHolding(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/investments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete holding");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
    },
  });

  function resetForm() {
    setForm({ symbol: "", quantity: "", avgCost: "", accountId: "" });
  }

  function openAddDialog() {
    setEditingHolding(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(holding: Holding) {
    setEditingHolding(holding);
    setForm({
      symbol: holding.symbol,
      quantity: String(holding.quantity),
      avgCost: String(holding.avgCost),
      accountId: holding.accountId,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingHolding) {
      updateMutation.mutate({
        id: editingHolding.id,
        quantity: parseFloat(form.quantity),
        avgCost: parseFloat(form.avgCost),
      });
    } else {
      createMutation.mutate({
        symbol: form.symbol.toUpperCase().trim(),
        quantity: parseFloat(form.quantity),
        avgCost: parseFloat(form.avgCost),
        accountId: form.accountId,
      });
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["investments"] });
    setRefreshing(false);
  }

  const holdings = data?.holdings ?? [];
  const summary = data?.summary;

  const pieData = holdings.map((h) => ({
    name: h.symbol,
    value: h.marketValue,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Investments</h1>
          {summary && (
            <p className="text-sm text-slate-400">
              Portfolio value {formatCurrency(summary.totalMarketValue)}
            </p>
          )}
        </div>
        <Button onClick={openAddDialog} className="bg-[#00d4aa] text-slate-900 hover:bg-[#00d4aa]/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Holding
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={cn(glassCard)}>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#00d4aa]/10 blur-2xl" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Market Value</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-[#00d4aa]">{formatCurrency(summary.totalMarketValue)}</div>
            </CardContent>
          </Card>

          <Card className={cn(glassCard)}>
            <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl", summary.totalUnrealizedGain >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10")} />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Unrealized Gain/Loss</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-center gap-2">
                <div className={cn("text-2xl font-bold", summary.totalUnrealizedGain >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {formatCurrency(summary.totalUnrealizedGain)}
                </div>
                {summary.totalUnrealizedGain >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-rose-400" />
                )}
              </div>
              <div className={cn("text-sm", summary.totalUnrealizedGain >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {formatPercent(summary.totalUnrealizedGainPercent)}
              </div>
            </CardContent>
          </Card>

          <Card className={cn(glassCard)}>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-slate-400/10 blur-2xl" />
            <CardHeader className="relative pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Cost Basis</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-slate-200">{formatCurrency(summary.totalCostBasis)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pie Chart */}
      {holdings.length > 0 && (
        <Card className={cn(glassCard)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-200">
              <PieChartIcon className="h-5 w-5 text-[#00d4aa]" />
              Portfolio Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.5rem" }}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Legend wrapperStyle={{ color: "#94a3b8" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Holdings Table */}
      <Card className={cn(glassCard)}>
        <CardHeader>
          <CardTitle className="text-slate-200">Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading holdings...</div>
          ) : holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="mb-4 h-12 w-12 text-slate-500" />
              <h3 className="text-lg font-semibold text-slate-200">No holdings yet</h3>
              <p className="mb-6 mt-1 max-w-sm text-sm text-slate-400">
                Add your first investment to start tracking your portfolio performance.
              </p>
              <Button onClick={openAddDialog} className="bg-[#00d4aa] text-slate-900 hover:bg-[#00d4aa]/90">
                <Plus className="mr-2 h-4 w-4" />
                Add your first holding
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400">Symbol</TableHead>
                    <TableHead className="text-slate-400">Quantity</TableHead>
                    <TableHead className="text-slate-400">Avg Cost</TableHead>
                    <TableHead className="text-slate-400">
                      <div className="flex items-center gap-2">
                        Live Price
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleRefresh}
                          disabled={refreshing}
                          className="h-6 w-6 text-slate-400 hover:text-slate-200"
                        >
                          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
                        </Button>
                      </div>
                    </TableHead>
                    <TableHead className="text-slate-400">Market Value</TableHead>
                    <TableHead className="text-slate-400">Gain/Loss</TableHead>
                    <TableHead className="text-slate-400">Gain/Loss %</TableHead>
                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((h) => (
                    <TableRow key={h.id} className="border-white/5">
                      <TableCell className="font-bold text-slate-200">{h.symbol}</TableCell>
                      <TableCell className="text-slate-300">{h.quantity.toFixed(4)}</TableCell>
                      <TableCell className="text-slate-300">{formatCurrency(h.avgCost)}</TableCell>
                      <TableCell className="text-slate-300">{formatCurrency(h.livePrice)}</TableCell>
                      <TableCell className="font-medium text-slate-200">{formatCurrency(h.marketValue)}</TableCell>
                      <TableCell className={cn("font-medium", h.unrealizedGain >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {formatCurrency(h.unrealizedGain)}
                      </TableCell>
                      <TableCell className={cn("font-medium", h.unrealizedGainPercent >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {formatPercent(h.unrealizedGainPercent)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditDialog(h)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-slate-400 hover:text-rose-400"
                            onClick={() => deleteMutation.mutate(h.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-0 bg-slate-900 ring-1 ring-white/10">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingHolding ? "Edit Holding" : "Add Holding"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingHolding && (
              <div className="space-y-2">
                <Label htmlFor="symbol" className="text-slate-300">Symbol</Label>
                <Input
                  id="symbol"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="AAPL"
                  required
                  className="bg-slate-800 ring-1 ring-white/10"
                />
              </div>
            )}
            {!editingHolding && (
              <div className="space-y-2">
                <Label htmlFor="account" className="text-slate-300">Account</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(value: string | null) => setForm({ ...form, accountId: value ?? "" })}
                >
                  <SelectTrigger className="bg-slate-800 ring-1 ring-white/10">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="border-0 bg-slate-800 ring-1 ring-white/10">
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="focus:bg-slate-700">
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-slate-300">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="10"
                required
                className="bg-slate-800 ring-1 ring-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avgCost" className="text-slate-300">Average Cost</Label>
              <Input
                id="avgCost"
                type="number"
                step="0.01"
                value={form.avgCost}
                onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
                placeholder="150.00"
                required
                className="bg-slate-800 ring-1 ring-white/10"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#00d4aa] text-slate-900 hover:bg-[#00d4aa]/90"
              >
                {editingHolding ? "Save Changes" : "Add Holding"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
