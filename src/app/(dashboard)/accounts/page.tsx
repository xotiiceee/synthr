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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
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

const accountTypeColors: Record<AccountType, string> = {
  CHECKING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  SAVINGS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CREDIT: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  CASH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  INVESTMENT: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  LOAN: "bg-orange-500/10 text-orange-400 border-orange-500/20",
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
  const totalValue = assets + liabilities;

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
          className="bg-[#00d4aa] text-slate-950 hover:bg-[#00d4aa]/90 shadow-lg shadow-[#00d4aa]/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Net Worth + Distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
              Net Worth
            </p>
            <p className="text-4xl md:text-5xl font-bold text-[#00d4aa] mt-2">
              {formatCurrency(netWorth)}
            </p>
          </div>
          <div className="flex gap-8 mt-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Total Assets
              </p>
              <p className="text-xl font-semibold text-emerald-400 mt-1">
                {formatCurrency(assets)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                Total Liabilities
              </p>
              <p className="text-xl font-semibold text-red-400 mt-1">
                {formatCurrency(liabilities)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6 flex flex-col">
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
                      backgroundColor: "#1e293b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      color: "#f8fafc",
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
              className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse h-44"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
          <p className="text-muted-foreground">
            No accounts yet. Add your first account to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const percent =
              totalValue > 0
                ? (Math.abs(Number(account.balance)) / totalValue) * 100
                : 0;
            return (
              <div
                key={account.id}
                className="group relative rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 transition-all hover:bg-white/[0.07] hover:border-white/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/5 p-3 text-[#00d4aa] ring-1 ring-white/10">
                      {accountTypeIcons[account.type]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {account.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${accountTypeColors[account.type]}`}
                        >
                          {account.type.charAt(0) +
                            account.type.slice(1).toLowerCase()}
                        </span>
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
                      className="text-muted-foreground hover:text-white hover:bg-white/10"
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
                      className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(Number(account.balance))}
                  </div>
                  <div className="mt-4">
                    <Progress value={percent} />
                    <p className="mt-1.5 text-xs text-muted-foreground">
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
        <DialogContent className="sm:max-w-md bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl">
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
                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50"
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
                      className="bg-white/5 border-white/10 text-white focus:ring-[#00d4aa]/50"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
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
                  className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50"
                />
              </div>
              {!editingAccount && (
                <div className="flex items-center gap-2">
                  <input
                    id="isDefault"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-white/10 bg-white/5 text-[#00d4aa] focus:ring-[#00d4aa]/50"
                  />
                  <Label
                    htmlFor="isDefault"
                    className="font-normal text-white/80"
                  >
                    Set as default account
                  </Label>
                </div>
              )}
            </div>
            <DialogFooter className="bg-white/5">
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
                className="bg-[#00d4aa] text-slate-950 hover:bg-[#00d4aa]/90"
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
