"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  Landmark,
  CreditCard,
  Banknote,
  TrendingUp,
  Receipt,
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { formatCurrency, cn } from "@/lib/utils";
import { AccountType } from "@prisma/client";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  isDefault: boolean;
}

const accountTypeIcons: Record<AccountType, React.ReactNode> = {
  CHECKING: <Wallet className="h-5 w-5" />,
  SAVINGS: <Landmark className="h-5 w-5" />,
  CREDIT: <CreditCard className="h-5 w-5" />,
  CASH: <Banknote className="h-5 w-5" />,
  INVESTMENT: <TrendingUp className="h-5 w-5" />,
  LOAN: <Receipt className="h-5 w-5" />,
};

const accountTypeLabel: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CREDIT: "Credit",
  CASH: "Cash",
  INVESTMENT: "Investment",
  LOAN: "Loan",
};

const accountChartColors: Record<AccountType, string> = {
  CHECKING: "#3b82f6",
  SAVINGS: "#10b981",
  CREDIT: "#a855f7",
  CASH: "#f59e0b",
  INVESTMENT: "#f43f5e",
  LOAN: "#f97316",
};

const liabilityTypes: AccountType[] = ["CREDIT", "LOAN"];

async function fetchAccounts(): Promise<{ accounts: Account[] }> {
  const res = await fetch("/api/accounts");
  if (!res.ok) throw new Error("Failed to fetch accounts");
  return res.json();
}

async function createAccount(data: {
  name: string;
  type: AccountType;
  balance: number;
  isDefault: boolean;
}) {
  const res = await fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create account");
  return res.json();
}

async function updateAccount(
  id: string,
  data: { name: string; balance: number }
) {
  const res = await fetch(`/api/accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update account");
  return res.json();
}

async function deleteAccount(id: string) {
  const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to delete account");
  }
  return res.json();
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const accounts = data?.accounts ?? [];

  const assets = accounts
    .filter((a) => !liabilityTypes.includes(a.type))
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const liabilities = accounts
    .filter((a) => liabilityTypes.includes(a.type))
    .reduce((sum, a) => sum + Number(a.balance), 0);

  const netWorth = assets - liabilities;
  const totalValue = accounts.reduce((sum, a) => sum + Math.abs(Number(a.balance)), 0);

  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    accounts.forEach((a) => {
      groups[a.type] = (groups[a.type] || 0) + Math.abs(Number(a.balance));
    });
    return Object.entries(groups).map(([type, value]) => ({
      name: type.charAt(0) + type.slice(1).toLowerCase(),
      value,
      color: accountChartColors[type as AccountType],
    }));
  }, [accounts]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [balance, setBalance] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const createMutation = useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; data: { name: string; balance: number } }) =>
      updateAccount(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  function openCreate() {
    setEditingAccount(null);
    setName("");
    setType("CHECKING");
    setBalance("");
    setIsDefault(false);
    setDialogOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setBalance(String(account.balance));
    setIsDefault(account.isDefault);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingAccount(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      type,
      balance: parseFloat(balance) || 0,
      isDefault,
    };
    if (editingAccount) {
      updateMutation.mutate({
        id: editingAccount.id,
        data: { name, balance: parseFloat(balance) || 0 },
      });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Accounts
          </h1>
          <p className="text-muted-foreground">
            View and manage your bank accounts.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 shadow-lg shadow-[#00d4aa]/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Net Worth + Distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Net Worth Card */}
        <div className="lg:col-span-2 rounded-xl bg-zinc-900 border border-white/5 p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4aa]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
              Net Worth
            </p>
            <p className="text-4xl md:text-5xl font-bold text-[#00d4aa] mt-2 tracking-tight">
              {formatCurrency(netWorth)}
            </p>
          </div>
          <div className="flex gap-8 mt-6 relative">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                  Assets
                </p>
                <p className="text-lg font-semibold text-emerald-400 mt-0.5">
                  {formatCurrency(assets)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                  Liabilities
                </p>
                <p className="text-lg font-semibold text-red-400 mt-0.5">
                  {formatCurrency(liabilities)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution Card */}
        <div className="rounded-xl bg-zinc-900 border border-white/5 p-6 flex flex-col">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium mb-4">
            Distribution
          </p>
          <div className="flex-1 min-h-[180px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: "12px",
                      color: "#fafafa",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No data
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-zinc-900 border border-white/5 p-5 animate-pulse h-44"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/50 p-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 mb-4">
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            No accounts yet. Add your first account to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const isLiability = liabilityTypes.includes(account.type);
            const absBalance = Math.abs(Number(account.balance));
            const percent =
              totalValue > 0
                ? (absBalance / totalValue) * 100
                : 0;
            const balanceColor = account.balance >= 0 ? "text-white" : "text-red-400";
            const progressColor = isLiability ? "bg-red-500" : "bg-[#00d4aa]";
            return (
              <div
                key={account.id}
                className="group relative rounded-xl bg-zinc-900 border border-white/5 p-5 transition-all hover:bg-zinc-800/80 hover:border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-zinc-800 p-2.5 text-[#00d4aa] ring-1 ring-white/5">
                      {accountTypeIcons[account.type]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {account.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-medium border-white/10 text-zinc-300 py-0">
                          {accountTypeLabel[account.type]}
                        </Badge>
                        {account.isDefault && (
                          <span className="text-[10px] text-[#00d4aa] font-medium">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(account)}
                      className="text-zinc-400 hover:text-white hover:bg-white/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to delete this account?"
                          )
                        ) {
                          deleteMutation.mutate(account.id);
                        }
                      }}
                      className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-5">
                  <p className={cn("text-2xl font-bold", balanceColor)}>
                    {isLiability && account.balance !== 0 ? "-" : ""}{formatCurrency(absBalance)}
                  </p>
                  <div className="mt-4">
                    <Progress value={percent}>
                      <ProgressTrack className="h-1.5 bg-white/5">
                        <ProgressIndicator className={cn("rounded-full", progressColor)} />
                      </ProgressTrack>
                    </Progress>
                    <p className="mt-1.5 text-xs text-zinc-500">
                      {percent.toFixed(1)}% of total portfolio
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/5 rounded-xl shadow-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingAccount ? "Edit Account" : "Add Account"}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? "Update your account details."
                  : "Create a new account to track your finances."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Account Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Main Checking"
                  required
                  className="bg-zinc-950 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50"
                />
              </div>
              {!editingAccount && (
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-white">
                    Account Type
                  </Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as AccountType)}
                  >
                    <SelectTrigger
                      id="type"
                      className="bg-zinc-950 border-white/10 text-white focus:ring-[#00d4aa]/50"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {Object.values(AccountType).map((t) => (
                        <SelectItem
                          key={t}
                          value={t}
                          className="text-white focus:bg-white/10"
                        >
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="balance" className="text-white">
                  Balance
                </Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-zinc-950 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50"
                />
              </div>
              {!editingAccount && (
                <div className="flex items-center gap-2">
                  <input
                    id="isDefault"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-zinc-950 text-[#00d4aa] focus:ring-[#00d4aa]/50"
                  />
                  <Label
                    htmlFor="isDefault"
                    className="font-normal text-zinc-300"
                  >
                    Set as default account
                  </Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                className="border-white/10 text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 shadow-lg shadow-[#00d4aa]/20"
              >
                {editingAccount ? "Save Changes" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
