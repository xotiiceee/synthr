"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Heart,
  Gamepad2,
  GraduationCap,
  Plane,
  Shirt,
  Smartphone,
  Coffee,
  Briefcase,
  Banknote,
  Target,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { formatCurrency, cn } from "@/lib/utils";

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

function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

async function fetchBudgets(period: string): Promise<{ budgets: Budget[] }> {
  const res = await fetch(`/api/budgets?period=${period}`);
  if (!res.ok) throw new Error("Failed to fetch budgets");
  return res.json();
}

async function fetchCategories(): Promise<{ categories: Category[] }> {
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
  if (percentage >= 80) return "bg-yellow-400";
  return "bg-[#00d4aa]";
}

function getProgressTextColor(percentage: number): string {
  if (percentage >= 100) return "text-red-400";
  if (percentage >= 80) return "text-yellow-400";
  return "text-[#00d4aa]";
}

const categoryIconMap: Record<string, React.ElementType> = {
  food: Utensils,
  dining: Utensils,
  groceries: ShoppingCart,
  transport: Car,
  travel: Plane,
  housing: Home,
  rent: Home,
  utilities: Zap,
  health: Heart,
  medical: Heart,
  entertainment: Gamepad2,
  education: GraduationCap,
  clothing: Shirt,
  technology: Smartphone,
  coffee: Coffee,
  work: Briefcase,
  income: Banknote,
  savings: PiggyBank,
  default: Target,
};

function CategoryIcon({
  name,
  color,
  className,
}: {
  name: string;
  color?: string | null;
  className?: string;
}) {
  const key = Object.keys(categoryIconMap).find((k) =>
    name.toLowerCase().includes(k)
  );
  const Icon = categoryIconMap[key || "default"] || Target;
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        className
      )}
      style={{ backgroundColor: `${color || "#00d4aa"}15`, color: color || "#00d4aa" }}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function CircularProgress({
  value,
  size = 160,
  strokeWidth = 12,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 100 ? "#ef4444" : clamped >= 80 ? "#facc15" : "#00d4aa";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
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

  const overallPercentage =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Budgets
          </h1>
          <p className="text-muted-foreground">
            Set and track your spending limits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 rounded-xl bg-zinc-900 border border-white/5">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-400 hover:text-white"
              onClick={() => setPeriod((p) => shiftPeriod(p, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium text-white">
              {formatPeriod(period)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-400 hover:text-white"
              onClick={() => setPeriod((p) => shiftPeriod(p, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={openCreate}
            className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 shadow-lg shadow-[#00d4aa]/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Budget
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-zinc-900 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#00d4aa]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-col items-center gap-6 py-8 md:flex-row md:justify-between md:px-8">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              Total Budgeted
            </p>
            <p className="text-4xl font-bold tracking-tight text-white">
              {formatCurrency(totalBudget)}
            </p>
            <div className="mt-2 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-zinc-300">
                  Spent {formatCurrency(totalSpent)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span
                  className={cn(
                    "font-medium",
                    totalRemaining >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {totalRemaining >= 0 ? "Left" : "Over"}{" "}
                  {formatCurrency(Math.abs(totalRemaining))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <CircularProgress value={overallPercentage} size={140} strokeWidth={10}>
              <div className="text-center">
                <div
                  className={cn(
                    "text-2xl font-bold",
                    getProgressTextColor(overallPercentage)
                  )}
                >
                  {overallPercentage.toFixed(0)}%
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Used
                </div>
              </div>
            </CircularProgress>
          </div>
        </div>
      </div>

      {/* Budgets Grid */}
      {budgetsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-zinc-900 border border-white/5 h-40 animate-pulse"
            />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/50 p-12 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00d4aa]/10 mb-4">
            <Wallet className="h-8 w-8 text-[#00d4aa]" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            No budgets set
          </h3>
          <p className="mt-1 max-w-xs mx-auto text-sm text-muted-foreground">
            Create your first budget to start tracking spending and stay in
            control of your finances.
          </p>
          <Button
            onClick={openCreate}
            className="mt-6 bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 shadow-lg shadow-[#00d4aa]/20"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create your first budget
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const percentage =
              Number(budget.amount) > 0
                ? (budget.spent / Number(budget.amount)) * 100
                : 0;
            return (
              <div
                key={budget.id}
                className="group rounded-xl bg-zinc-900 border border-white/5 p-5 transition-all hover:bg-zinc-800/80 hover:border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      name={budget.category.name}
                      color={budget.category.color}
                    />
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        {budget.category.name}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {formatCurrency(budget.spent)} of{" "}
                        {formatCurrency(Number(budget.amount))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(budget)}
                      className="text-zinc-400 hover:text-white hover:bg-white/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to delete this budget?"
                          )
                        ) {
                          deleteMutation.mutate(budget.id);
                        }
                      }}
                      className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={cn(
                        "font-semibold",
                        getProgressTextColor(percentage)
                      )}
                    >
                      {percentage.toFixed(0)}%
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        budget.remaining >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      )}
                    >
                      {budget.remaining >= 0
                        ? `${formatCurrency(budget.remaining)} left`
                        : `${formatCurrency(Math.abs(budget.remaining))} over`}
                    </span>
                  </div>
                  <Progress value={Math.min(percentage, 100)}>
                    <ProgressTrack className="h-2 bg-white/5">
                      <ProgressIndicator
                        className={cn(
                          "rounded-full",
                          getProgressColor(percentage)
                        )}
                      />
                    </ProgressTrack>
                  </Progress>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-zinc-500">
                    Target{" "}
                    <span className="text-zinc-300">
                      {formatCurrency(Number(budget.amount))}
                    </span>
                  </p>
                  {budget.rollover && (
                    <div className="flex items-center gap-1 text-xs font-medium text-[#00d4aa]">
                      <RotateCcw className="h-3 w-3" />
                      Rollover
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/5 rounded-xl shadow-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-white">
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
                <Label htmlFor="category" className="text-white">Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={(val) => setCategoryId(val ?? "")}
                  disabled={!!editingBudget}
                >
                  <SelectTrigger
                    id="category"
                    className="bg-zinc-950 border-white/10 text-white"
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id}
                        className="text-white focus:bg-white/10"
                      >
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-white">Budget Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-zinc-950 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="rollover"
                  type="checkbox"
                  checked={rollover}
                  onChange={(e) => setRollover(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-zinc-950 text-[#00d4aa]"
                />
                <Label htmlFor="rollover" className="font-normal text-zinc-300">
                  Enable rollover
                </Label>
              </div>
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
                disabled={createMutation.isPending}
                className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 shadow-lg shadow-[#00d4aa]/20"
              >
                {editingBudget ? "Save Changes" : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
