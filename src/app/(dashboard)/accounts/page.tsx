"use client";

import { useState } from "react";
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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";
import { AccountType } from "@prisma/client";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">View and manage your bank accounts.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-emerald-400">{formatCurrency(assets)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Liabilities</CardDescription>
            <CardTitle className="text-red-400">{formatCurrency(liabilities)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Net Worth</CardDescription>
            <CardTitle className="text-[#00d4aa]">{formatCurrency(netWorth)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No accounts yet. Add your first account to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className={`border ${accountTypeColors[account.type]}`}
            >
              <CardHeader className="flex-row items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-background/50 p-2">
                    {accountTypeIcons[account.type]}
                  </div>
                  <div>
                    <CardTitle className="text-base">{account.name}</CardTitle>
                    <CardDescription className="capitalize">
                      {account.type.toLowerCase()}
                      {account.isDefault && (
                        <span className="ml-2 text-[#00d4aa]">(Default)</span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(account)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this account?")) {
                        deleteMutation.mutate(account.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(account.balance))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
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
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Main Checking"
                  required
                />
              </div>
              {!editingAccount && (
                <div className="space-y-2">
                  <Label htmlFor="type">Account Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as AccountType)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AccountType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="balance">Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              {!editingAccount && (
                <div className="flex items-center gap-2">
                  <input
                    id="isDefault"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="isDefault" className="font-normal">
                    Set as default account
                  </Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingAccount ? "Save Changes" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
