"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { TransactionType } from "@prisma/client";
import { TransactionForm } from "./transaction-form";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
}

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  notes?: string | null;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  account?: Account | null;
  tags: { tagId: string; tag: Tag }[];
}

async function fetchTransactions(params: Record<string, string>): Promise<Transaction[]> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/transactions?${query}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

async function fetchAccounts(): Promise<{ accounts: Account[] }> {
  const res = await fetch("/api/accounts");
  if (!res.ok) throw new Error("Failed to fetch accounts");
  return res.json();
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function deleteTransaction(id: string) {
  const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete transaction");
  return res.json();
}

export function TransactionList() {
  const queryClient = useQueryClient();

  const [filterType, setFilterType] = useState<"ALL" | TransactionType>("ALL");
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (filterType !== "ALL") p.type = filterType;
    if (filterAccountId) p.accountId = filterAccountId;
    if (filterCategoryId) p.categoryId = filterCategoryId;
    if (filterStartDate) p.startDate = filterStartDate;
    if (filterEndDate) p.endDate = filterEndDate;
    return p;
  }, [filterType, filterAccountId, filterCategoryId, filterStartDate, filterEndDate]);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", params],
    queryFn: () => fetchTransactions(params),
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const accounts = accountsData?.accounts ?? [];
  const categories = categoriesData ?? [];

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  function openCreate() {
    setEditingTransaction(null);
    setFormOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTransaction(tx);
    setFormOpen(true);
  }

  const rows = transactions ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label className="text-xs">Type</Label>
          <Select value={filterType} onValueChange={(v) => { if (v !== null) setFilterType(v as typeof filterType); }}>
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label className="text-xs">Account</Label>
          <Select value={filterAccountId} onValueChange={(v) => { if (v !== null) setFilterAccountId(v); }}>
            <SelectTrigger>
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label className="text-xs">Category</Label>
          <Select value={filterCategoryId} onValueChange={(v) => { if (v !== null) setFilterCategoryId(v); }}>
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label className="text-xs">Start Date</Label>
          <Input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>

        <div className="flex-1 space-y-2">
          <Label className="text-xs">End Date</Label>
          <Input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            setFilterType("ALL");
            setFilterAccountId("");
            setFilterCategoryId("");
            setFilterStartDate("");
            setFilterEndDate("");
          }}>
            Reset
          </Button>
          <Button onClick={openCreate}>Add Transaction</Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-muted-foreground">Loading transactions...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No transactions found. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tx) => {
                const amount = Number(tx.amount);
                const isIncome = tx.type === "INCOME";
                const isExpense = tx.type === "EXPENSE";
                const amountColor = isIncome
                  ? "text-emerald-400"
                  : isExpense
                  ? "text-red-400"
                  : "text-muted-foreground";
                const sign = isIncome ? "+" : isExpense ? "-" : "";

                return (
                  <TableRow key={tx.id}>
                    <TableCell>{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{tx.description}</div>
                      {tx.notes && (
                        <div className="text-xs text-muted-foreground">{tx.notes}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.category ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: tx.category.color
                              ? `${tx.category.color}20`
                              : "rgba(0,212,170,0.15)",
                            color: tx.category.color ?? "#00d4aa",
                          }}
                        >
                          {tx.category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{tx.account?.name ?? "-"}</div>
                      {tx.toAccountId && (
                        <div className="text-xs text-muted-foreground">
                          to {accounts.find((a) => a.id === tx.toAccountId)?.name ?? "-"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tx.tags.map((t) => (
                          <span
                            key={t.tagId}
                            className="rounded-full px-1.5 py-0.5 text-[10px] border border-border text-muted-foreground"
                          >
                            {t.tag.name}
                          </span>
                        ))}
                        {tx.tags.length === 0 && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", amountColor)}>
                      {sign}
                      {formatCurrency(amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(tx)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            if (
                              confirm("Are you sure you want to delete this transaction?")
                            ) {
                              deleteMutation.mutate(tx.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}
