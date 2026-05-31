"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react";

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

  const holdings = data?.holdings ?? [];
  const summary = data?.summary;

  const pieData = holdings.map((h) => ({
    name: h.symbol,
    value: h.marketValue,
  }));

  // Synthetic line chart data: cost basis vs market value snapshot
  const lineData = summary
    ? [
        { name: "Cost Basis", value: summary.totalCostBasis },
        { name: "Market Value", value: summary.totalMarketValue },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investments</h1>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Holding
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Market Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalMarketValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Unrealized Gain/Loss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${summary.totalUnrealizedGain >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatCurrency(summary.totalUnrealizedGain)}
                </div>
                {summary.totalUnrealizedGain >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className={`text-sm ${summary.totalUnrealizedGain >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatPercent(summary.totalUnrealizedGainPercent)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cost Basis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalCostBasis)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {holdings.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#00d4aa" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : holdings.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No holdings yet. Add your first investment to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Avg Cost</TableHead>
                  <TableHead>Live Price</TableHead>
                  <TableHead>Market Value</TableHead>
                  <TableHead>Gain/Loss</TableHead>
                  <TableHead>Gain/Loss %</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.symbol}</TableCell>
                    <TableCell>{h.quantity.toFixed(4)}</TableCell>
                    <TableCell>{formatCurrency(h.avgCost)}</TableCell>
                    <TableCell>{formatCurrency(h.livePrice)}</TableCell>
                    <TableCell>{formatCurrency(h.marketValue)}</TableCell>
                    <TableCell className={h.unrealizedGain >= 0 ? "text-green-500" : "text-red-500"}>
                      {formatCurrency(h.unrealizedGain)}
                    </TableCell>
                    <TableCell className={h.unrealizedGainPercent >= 0 ? "text-green-500" : "text-red-500"}>
                      {formatPercent(h.unrealizedGainPercent)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(h)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500"
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
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHolding ? "Edit Holding" : "Add Holding"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingHolding && (
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  placeholder="AAPL"
                  required
                />
              </div>
            )}
            {!editingHolding && (
              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(value: string | null) => setForm({ ...form, accountId: value ?? "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.0001"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avgCost">Average Cost</Label>
              <Input
                id="avgCost"
                type="number"
                step="0.01"
                value={form.avgCost}
                onChange={(e) => setForm({ ...form, avgCost: e.target.value })}
                placeholder="150.00"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingHolding ? "Save Changes" : "Add Holding"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
