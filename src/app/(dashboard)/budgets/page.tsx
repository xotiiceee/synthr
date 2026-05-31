"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

interface Budget {
  id: string;
  amount: number;
  period: string;
  rollover: boolean;
  categoryId: string;
  category: { name: string; color?: string | null };
  spent: number;
  remaining: number;
}

interface Category {
  id: string;
  name: string;
  color?: string | null;
}

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function shiftPeriod(period: string, delta: number): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${newYear}-${newMonth}`;
}

async function fetchBudgets(period: string): Promise<{ budgets: Budget[] }> {
  const res = await fetch(`/api/budgets?period=${period}`);
  if (!res.ok) throw new Error("Failed to fetch budgets");
  return res.json();
}

async function fetchCategories(): Promise<{ categories: Category[] }> {
  // Categories are user-specific; we'll need an API for this.
  // For now, reuse an existing endpoint if available or create a simple one.
  // Since the schema has categories per user, let's create a simple GET on /api/categories
  // We'll define the API below.
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function createBudget(data: {
  categoryId: string;
  amount: number;
  period: string;
  rollover: boolean;
}) {
  const res = await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create budget");
  return res.json();
}

async function deleteBudget(id: string) {
  const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete budget");
  return res.json();
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 80) return "bg-yellow-500";
  return "bg-emerald-500";
}

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [rollover, setRollover] = useState(false);

  const { data: budgetsData, isLoading: budgetsLoading } = useQuery({
    queryKey: ["budgets", period],
    queryFn: () => fetchBudgets(period),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const budgets = budgetsData?.budgets ?? [];
  const categories = categoriesData?.categories ?? [];

  const totalBudget = useMemo(
    () => budgets.reduce((sum, b) => sum + Number(b.amount), 0),
    [budgets]
  );
  const totalSpent = useMemo(
    () => budgets.reduce((sum, b) => sum + b.spent, 0),
    [budgets]
  );
  const totalRemaining = useMemo(
    () => budgets.reduce((sum, b) => sum + b.remaining, 0),
    [budgets]
  );

  const createMutation = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", period] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", period] });
    },
  });

  function openCreate() {
    setEditingBudget(null);
    setCategoryId("");
    setAmount("");
    setRollover(false);
    setDialogOpen(true);
  }

  function openEdit(budget: Budget) {
    setEditingBudget(budget);
    setCategoryId(budget.categoryId);
    setAmount(String(budget.amount));
    setRollover(budget.rollover);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingBudget(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      categoryId,
      amount: parseFloat(amount) || 0,
      period: editingBudget ? editingBudget.period : period,
      rollover,
    };
    createMutation.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">Set and track your spending limits.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[100px] text-center text-sm font-medium">
            {period}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={openCreate} className="ml-2">
            <Plus className="mr-2 h-4 w-4" />
            Add Budget
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Budgeted</CardDescription>
            <CardTitle className="text-[#00d4aa]">{formatCurrency(totalBudget)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Spent</CardDescription>
            <CardTitle className="text-red-400">{formatCurrency(totalSpent)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="text-emerald-400">{formatCurrency(totalRemaining)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {budgetsLoading ? (
        <div className="text-muted-foreground">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No budgets for {period}. Add a budget to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {budgets.map((budget) => {
            const percentage =
              Number(budget.amount) > 0
                ? (budget.spent / Number(budget.amount)) * 100
                : 0;
            return (
              <Card key={budget.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: budget.category.color ?? "#00d4aa",
                        }}
                      />
                      <div>
                        <CardTitle className="text-base">
                          {budget.category.name}
                        </CardTitle>
                        <CardDescription>
                          {formatCurrency(budget.spent)} of{" "}
                          {formatCurrency(Number(budget.amount))}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {percentage.toFixed(0)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(budget)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (
                            confirm("Are you sure you want to delete this budget?")
                          ) {
                            deleteMutation.mutate(budget.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={Math.min(percentage, 100)}>
                      <ProgressTrack>
                        <ProgressIndicator
                          className={getProgressColor(percentage)}
                        />
                      </ProgressTrack>
                    </Progress>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                    <span>
                      Remaining: {formatCurrency(budget.remaining)}
                    </span>
                    {budget.rollover && <span>Rollover enabled</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? "Edit Budget" : "Add Budget"}
              </DialogTitle>
              <DialogDescription>
                {editingBudget
                  ? "Update your budget."
                  : "Set a spending limit for a category."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={(val) => setCategoryId(val ?? "")}
                  disabled={!!editingBudget}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Budget Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="rollover"
                  type="checkbox"
                  checked={rollover}
                  onChange={(e) => setRollover(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="rollover" className="font-normal">
                  Enable rollover
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {editingBudget ? "Save Changes" : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
