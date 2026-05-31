"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Progress,
  ProgressTrack,
  ProgressIndicator,
} from "@/components/ui/progress";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
} from "recharts";
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  CreditCard,
  Settings,
  Lightbulb,
  Sparkles,
  PiggyBank,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ───────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Types ─────────────────────────────────────────────────
interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  priority: number;
}

interface Debt {
  id: string;
  name: string;
  type: string;
  balance: number;
  apr: number;
  minimumPayment: number;
  payoffStrategy: "AVALANCHE" | "SNOWBALL";
}

interface PayoffDebt {
  id: string;
  name: string;
  type: string;
  balance: number;
  apr: number;
  minimumPayment: number;
  payoffStrategy: "AVALANCHE" | "SNOWBALL";
  estimatedPayoffMonths: number | null;
  estimatedPayoffDate: string | null;
}

interface AdvisorData {
  incomeFrequency: string;
  targetRate: number;
  avgIncome: number;
  fixedExpenses: number;
  variableAvg: number;
  recommendedSavings: number;
  safeToSpend: number;
  actualSavingsRate: number;
  status: "On Track" | "Getting There" | "At Risk";
  allocations: { debt: number; goals: number };
  payoffOrder: PayoffDebt[];
}

// ─── Schemas ───────────────────────────────────────────────
const goalSchema = z.object({
  name: z.string().min(1, "Name is required"),
  targetAmount: z.coerce.number().positive("Must be positive"),
  currentAmount: z.coerce.number().min(0).optional(),
  deadline: z.string().optional(),
  priority: z.coerce.number().min(1).max(5),
});

const debtSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  balance: z.coerce.number().min(0),
  apr: z.coerce.number().min(0),
  minimumPayment: z.coerce.number().positive("Must be positive"),
  payoffStrategy: z.enum(["AVALANCHE", "SNOWBALL"]),
});

const contributeSchema = z.object({
  amount: z.coerce.number().positive("Must be positive"),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Must be positive"),
});

const advisorSettingsSchema = z.object({
  incomeFrequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]),
  targetRate: z.coerce.number().min(0).max(1),
  fixedExpenses: z.coerce.number().min(0),
});

// ─── Fetchers ──────────────────────────────────────────────
async function fetchGoals(): Promise<SavingsGoal[]> {
  const res = await fetch("/api/savings-goals");
  if (!res.ok) throw new Error("Failed to load goals");
  return res.json();
}

async function fetchDebts(): Promise<Debt[]> {
  const res = await fetch("/api/debts");
  if (!res.ok) throw new Error("Failed to load debts");
  return res.json();
}

async function fetchAdvisor(): Promise<AdvisorData> {
  const res = await fetch("/api/savings-advisor");
  if (!res.ok) throw new Error("Failed to load advisor");
  return res.json();
}

// ─── Visual helpers ──────────────────────────────────────
const glassCard =
  "relative overflow-hidden border border-white/5 bg-zinc-900 rounded-xl";

function StatusGauge({
  status,
  actualRate,
  targetRate,
}: {
  status: AdvisorData["status"];
  actualRate: number;
  targetRate: number;
}) {
  const pct = Math.min((actualRate / Math.max(targetRate, 0.01)) * 50, 100);
  const color =
    status === "On Track"
      ? "#00d4aa"
      : status === "Getting There"
      ? "#facc15"
      : "#ef4444";

  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative"
        style={{ width: size, height: size / 2 + 10 }}
      >
        <svg width={size} height={size / 2 + 10} className="overflow-visible">
          <path
            d={`M ${strokeWidth / 2} ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2 + 10}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${strokeWidth / 2} ${size / 2 + 10} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2 + 10}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color }}
          >
            {formatPercent(actualRate)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            Actual Rate
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: `${color}18`, color }}>
        {status === "On Track" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : status === "Getting There" ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        {status}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────
export default function SavingsAdvisorPage() {
  const [tab, setTab] = useState("advisor");
  const queryClient = useQueryClient();

  // Queries
  const {
    data: goals = [],
    isLoading: goalsLoading,
  } = useQuery({ queryKey: ["savings-goals"], queryFn: fetchGoals });
  const {
    data: debts = [],
    isLoading: debtsLoading,
  } = useQuery({ queryKey: ["debts"], queryFn: fetchDebts });
  const {
    data: advisor,
  } = useQuery({ queryKey: ["savings-advisor"], queryFn: fetchAdvisor });

  // ─── Mutations ───────────────────────────────────────────
  const createGoal = useMutation({
    mutationFn: async (values: z.infer<typeof goalSchema>) => {
      const res = await fetch("/api/savings-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast.success("Goal created");
    },
    onError: () => toast.error("Failed to create goal"),
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: z.infer<typeof goalSchema> }) => {
      const res = await fetch(`/api/savings-goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast.success("Goal updated");
    },
    onError: () => toast.error("Failed to update goal"),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/savings-goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast.success("Goal deleted");
    },
    onError: () => toast.error("Failed to delete goal"),
  });

  const contributeGoal = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await fetch(`/api/savings-goals/${id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Failed to contribute");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] });
      toast.success("Contribution added");
    },
    onError: () => toast.error("Failed to contribute"),
  });

  const createDebt = useMutation({
    mutationFn: async (values: z.infer<typeof debtSchema>) => {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create debt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["savings-advisor"] });
      toast.success("Debt created");
    },
    onError: () => toast.error("Failed to create debt"),
  });

  const updateDebt = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: z.infer<typeof debtSchema> }) => {
      const res = await fetch(`/api/debts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update debt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["savings-advisor"] });
      toast.success("Debt updated");
    },
    onError: () => toast.error("Failed to update debt"),
  });

  const deleteDebt = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/debts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete debt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["savings-advisor"] });
      toast.success("Debt deleted");
    },
    onError: () => toast.error("Failed to delete debt"),
  });

  const paymentDebt = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await fetch(`/api/debts/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Failed to record payment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["savings-advisor"] });
      toast.success("Payment recorded");
    },
    onError: () => toast.error("Failed to record payment"),
  });

  const updateAdvisor = useMutation({
    mutationFn: async (values: z.infer<typeof advisorSettingsSchema>) => {
      const res = await fetch("/api/savings-advisor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-advisor"] });
      toast.success("Settings updated");
    },
    onError: () => toast.error("Failed to update settings"),
  });

  // ─── Forms ───────────────────────────────────────────────
  const goalForm = useForm<any>({
    resolver: zodResolver(goalSchema) as any,
    defaultValues: {
      name: "",
      targetAmount: 0,
      currentAmount: 0,
      deadline: "",
      priority: 3,
    },
  });

  const debtForm = useForm<any>({
    resolver: zodResolver(debtSchema) as any,
    defaultValues: {
      name: "",
      type: "",
      balance: 0,
      apr: 0,
      minimumPayment: 0,
      payoffStrategy: "AVALANCHE",
    },
  });

  const contributeForm = useForm<any>({
    resolver: zodResolver(contributeSchema) as any,
    defaultValues: { amount: 0 },
  });

  const paymentForm = useForm<any>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: { amount: 0 },
  });

  const settingsForm = useForm<any>({
    resolver: zodResolver(advisorSettingsSchema) as any,
    defaultValues: {
      incomeFrequency: "MONTHLY",
      targetRate: 0.2,
      fixedExpenses: 0,
    },
  });

  // ─── Dialog State ────────────────────────────────────────
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);

  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  function openGoalEdit(goal: SavingsGoal) {
    setEditingGoal(goal);
    goalForm.reset({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline ? format(new Date(goal.deadline), "yyyy-MM-dd") : "",
      priority: goal.priority,
    });
    setGoalDialogOpen(true);
  }

  function openGoalCreate() {
    setEditingGoal(null);
    goalForm.reset({
      name: "",
      targetAmount: 0,
      currentAmount: 0,
      deadline: "",
      priority: 3,
    });
    setGoalDialogOpen(true);
  }

  function openDebtEdit(debt: Debt) {
    setEditingDebt(debt);
    debtForm.reset({
      name: debt.name,
      type: debt.type,
      balance: debt.balance,
      apr: debt.apr,
      minimumPayment: debt.minimumPayment,
      payoffStrategy: debt.payoffStrategy,
    });
    setDebtDialogOpen(true);
  }

  function openDebtCreate() {
    setEditingDebt(null);
    debtForm.reset({
      name: "",
      type: "",
      balance: 0,
      apr: 0,
      minimumPayment: 0,
      payoffStrategy: "AVALANCHE",
    });
    setDebtDialogOpen(true);
  }

  function openSettings() {
    if (advisor) {
      settingsForm.reset({
        incomeFrequency: advisor.incomeFrequency as any,
        targetRate: advisor.targetRate ?? 0.2,
        fixedExpenses: advisor.fixedExpenses,
      });
    }
    setSettingsDialogOpen(true);
  }

  // ─── Submit Handlers ─────────────────────────────────────
  function onGoalSubmit(values: z.infer<typeof goalSchema>) {
    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, values });
    } else {
      createGoal.mutate(values);
    }
    setGoalDialogOpen(false);
  }

  function onDebtSubmit(values: z.infer<typeof debtSchema>) {
    if (editingDebt) {
      updateDebt.mutate({ id: editingDebt.id, values });
    } else {
      createDebt.mutate(values);
    }
    setDebtDialogOpen(false);
  }

  function onContributeSubmit(values: z.infer<typeof contributeSchema>) {
    if (contributeGoalId) {
      contributeGoal.mutate({ id: contributeGoalId, amount: values.amount });
    }
    setContributeGoalId(null);
    contributeForm.reset();
  }

  function onPaymentSubmit(values: z.infer<typeof paymentSchema>) {
    if (paymentDebtId) {
      paymentDebt.mutate({ id: paymentDebtId, amount: values.amount });
    }
    setPaymentDebtId(null);
    paymentForm.reset();
  }

  function onSettingsSubmit(values: z.infer<typeof advisorSettingsSchema>) {
    updateAdvisor.mutate(values);
    setSettingsDialogOpen(false);
  }

  // ─── Render Helpers ──────────────────────────────────────
  const allocationData = advisor
    ? [
        { name: "Debt Payoff", value: advisor.allocations.debt },
        { name: "Savings Goals", value: advisor.allocations.goals },
      ].filter((d) => d.value > 0)
    : [];

  const COLORS = ["#f59e0b", "#00d4aa"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Savings Advisor
          </h1>
          <p className="text-sm text-zinc-400">
            Smart recommendations to maximize your savings
          </p>
        </div>
        <Button
          variant="outline"
          onClick={openSettings}
          className="border-white/5 bg-zinc-800/50 text-white hover:bg-white/5 hover:text-white"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 bg-zinc-800/50 border border-white/5 md:w-auto">
          <TabsTrigger
            value="advisor"
            className="data-[state=active]:bg-[#00d4aa] data-[state=active]:text-black"
          >
            Advisor
          </TabsTrigger>
          <TabsTrigger
            value="goals"
            className="data-[state=active]:bg-[#00d4aa] data-[state=active]:text-black"
          >
            Goals
          </TabsTrigger>
          <TabsTrigger
            value="debts"
            className="data-[state=active]:bg-[#00d4aa] data-[state=active]:text-black"
          >
            Debts
          </TabsTrigger>
        </TabsList>

        {/* ─── ADVISOR TAB ────────────────────────────────── */}
        <TabsContent value="advisor" className="space-y-6">
          {/* Status + Gauge */}
          <Card className={cn(glassCard)}>
            <CardContent className="flex flex-col items-center gap-6 py-8 md:flex-row md:justify-between md:px-8">
              <div className="flex flex-col items-center gap-2 md:items-start">
                <div className="text-sm font-medium text-zinc-400">
                  Savings Health
                </div>
                <div className="text-3xl font-bold text-white">
                  {advisor?.status ?? "Loading…"}
                </div>
                <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                  <Target className="h-4 w-4 text-[#00d4aa]" />
                  Target: {advisor ? formatPercent(advisor.targetRate ?? 0.2) : "20%"}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Based on your income and expense patterns
                </div>
              </div>
              {advisor && (
                <StatusGauge
                  status={advisor.status}
                  actualRate={advisor.actualSavingsRate}
                  targetRate={advisor.targetRate ?? 0.2}
                />
              )}
            </CardContent>
          </Card>

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className={cn(glassCard, "border-t-2 border-t-teal-500")}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-zinc-300">
                    Average Income
                  </CardTitle>
                  <div className="rounded-lg bg-teal-500/10 p-2">
                    <Landmark className="h-4 w-4 text-teal-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-white">
                  {advisor ? formatCurrency(advisor.avgIncome) : "—"}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                  per {advisor?.incomeFrequency.toLowerCase() ?? "month"}
                </div>
              </CardContent>
            </Card>

            <Card className={cn(glassCard, "border-t-2 border-t-rose-500")}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-zinc-300">
                    Fixed Expenses
                  </CardTitle>
                  <div className="rounded-lg bg-rose-500/10 p-2">
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-white">
                  {advisor ? formatCurrency(advisor.fixedExpenses) : "—"}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Including minimum debt payments
                </div>
              </CardContent>
            </Card>

            <Card className={cn(glassCard, "border-t-2 border-t-[#00d4aa]")}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-zinc-300">
                    Recommended Savings
                  </CardTitle>
                  <div className="rounded-lg bg-[#00d4aa]/10 p-2">
                    <PiggyBank className="h-4 w-4 text-[#00d4aa]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-white">
                  {advisor ? formatCurrency(advisor.recommendedSavings) : "—"}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Target rate applied to income
                </div>
              </CardContent>
            </Card>

            <Card className={cn(glassCard, "border-t-2 border-t-emerald-500")}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-zinc-300">
                    Safe to Spend
                  </CardTitle>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <Wallet className="h-4 w-4 text-emerald-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-white">
                  {advisor ? formatCurrency(advisor.safeToSpend) : "—"}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  After savings and fixed costs
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendation */}
          <Card className={cn(glassCard)}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00d4aa]" />
                <CardTitle className="text-base text-white">
                  Recommendation
                </CardTitle>
              </div>
              <CardDescription>
                Personalized savings allocation based on your cash flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {advisor && (
                <>
                  <div className="rounded-xl bg-zinc-900/60 p-4 ring-1 ring-white/5">
                    <p className="text-sm leading-relaxed text-zinc-300">
                      Based on your income and expenses, you can safely save{" "}
                      <span className="font-semibold text-[#00d4aa]">
                        {formatCurrency(advisor.recommendedSavings)}
                      </span>{" "}
                      per month. We recommend putting{" "}
                      <span className="font-semibold text-amber-400">
                        {formatCurrency(advisor.allocations.debt)}
                      </span>{" "}
                      toward debt and{" "}
                      <span className="font-semibold text-[#00d4aa]">
                        {formatCurrency(advisor.allocations.goals)}
                      </span>{" "}
                      toward your savings goals.
                    </p>
                  </div>

                  {allocationData.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={allocationData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              innerRadius={45}
                              paddingAngle={4}
                              label={((props: any) =>
                                `${props.name}`) as any}
                            >
                              {allocationData.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <ReTooltip
                              formatter={((value: any) =>
                                formatCurrency(value)) as any}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col justify-center gap-3">
                        {allocationData.map((item, idx) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between rounded-lg bg-zinc-900/40 p-3 ring-1 ring-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-block h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    COLORS[idx % COLORS.length],
                                }}
                              />
                              <span className="text-sm text-zinc-300">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-semibold text-white">
                              {formatCurrency(item.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Savings Rate Progress */}
          <Card className={cn(glassCard)}>
            <CardHeader>
              <CardTitle className="text-base text-white">
                Actual Savings Rate vs. Target
              </CardTitle>
              <CardDescription>
                Target is {advisor ? formatPercent(advisor.targetRate ?? 0.2) : "20%"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {advisor && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Progress</span>
                      <span className="font-medium text-white">
                        {formatPercent(advisor.actualSavingsRate)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(advisor.actualSavingsRate * 100, 100)}
                      className="w-full"
                    >
                      <ProgressTrack className="h-2.5 bg-zinc-700/50">
                        <ProgressIndicator
                          className={cn(
                            "rounded-full",
                            advisor.actualSavingsRate >= (advisor.targetRate ?? 0.2)
                              ? "bg-[#00d4aa]"
                              : advisor.actualSavingsRate >= (advisor.targetRate ?? 0.2) * 0.6
                              ? "bg-yellow-400"
                              : "bg-red-500"
                          )}
                        />
                      </ProgressTrack>
                    </Progress>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-500">
                    <span>0%</span>
                    <span>Target: {advisor ? formatPercent(advisor.targetRate ?? 0.2) : "20%"}</span>
                    <span>100%</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payoff Strategy */}
          {advisor && advisor.payoffOrder.length > 0 && (
            <Card className={cn(glassCard)}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-400" />
                  <CardTitle className="text-base text-white">
                    Payoff Strategy
                  </CardTitle>
                </div>
                <CardDescription>
                  Recommended order to eliminate debts (Avalanche: highest APR first)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {advisor.payoffOrder.map((d, idx) => (
                    <div
                      key={d.id}
                      className="flex items-start justify-between rounded-xl bg-zinc-900/40 p-4 ring-1 ring-white/5 transition-colors hover:bg-zinc-900/60"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-white">{d.name}</span>
                          <Badge
                            variant="outline"
                            className="border-white/5 text-[10px] capitalize text-zinc-400"
                          >
                            {d.payoffStrategy.toLowerCase()}
                          </Badge>
                        </div>
                        <div className="pl-8 text-xs text-zinc-500">
                          APR {d.apr}% · Min {formatCurrency(d.minimumPayment)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          {formatCurrency(d.balance)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {d.estimatedPayoffDate
                            ? `Payoff ${format(new Date(d.estimatedPayoffDate), "MMM yyyy")}`
                            : "Never at minimum"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── GOALS TAB ─────────────────────────────────── */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Savings Goals</h2>
            <Button
              onClick={openGoalCreate}
              className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </div>

          {goalsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className={cn(glassCard, "h-48 animate-pulse bg-zinc-800/30")} />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <Card className={cn(glassCard, "py-12")}>
              <CardContent className="text-center text-zinc-400">
                <Target className="mx-auto mb-3 h-8 w-8 text-zinc-500" />
                <p className="text-white">No savings goals yet.</p>
                <p className="text-sm text-zinc-400">
                  Create one to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => {
                const pct = Math.min(
                  100,
                  Math.round(
                    (goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100
                  )
                );
                return (
                  <Card key={goal.id} className={cn(glassCard, "flex flex-col")}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base text-white">
                            {goal.name}
                          </CardTitle>
                          <CardDescription>
                            Priority {goal.priority}
                            {goal.deadline && (
                              <span className="ml-2">
                                · {format(new Date(goal.deadline), "MMM yyyy")}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-white"
                            onClick={() => openGoalEdit(goal)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-red-400"
                            onClick={() => deleteGoal.mutate(goal.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Progress</span>
                          <span className="font-medium text-white">{pct}%</span>
                        </div>
                        <Progress value={pct} className="w-full">
                          <ProgressTrack className="h-2 bg-zinc-700/50">
                            <ProgressIndicator className="rounded-full bg-[#00d4aa]" />
                          </ProgressTrack>
                        </Progress>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span className="font-medium text-white">
                          {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-white/5 bg-zinc-900/30">
                      <Button
                        variant="secondary"
                        className="w-full bg-zinc-700/40 text-white hover:bg-zinc-700/60"
                        onClick={() => {
                          setContributeGoalId(goal.id);
                          contributeForm.reset({ amount: 0 });
                        }}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Contribute
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── DEBTS TAB ──────────────────────────────────── */}
        <TabsContent value="debts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Debt Tracking</h2>
            <Button
              onClick={openDebtCreate}
              className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Debt
            </Button>
          </div>

          {debtsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className={cn(glassCard, "h-28 animate-pulse bg-zinc-800/30")} />
              ))}
            </div>
          ) : debts.length === 0 ? (
            <Card className={cn(glassCard, "py-12")}>
              <CardContent className="text-center text-zinc-400">
                <CreditCard className="mx-auto mb-3 h-8 w-8 text-zinc-500" />
                <p className="text-white">No debts tracked yet.</p>
                <p className="text-sm text-zinc-400">
                  Add one to see payoff recommendations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {debts.map((debt) => (
                  <Card key={debt.id} className={cn(glassCard)}>
                    <CardContent className="py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-zinc-400" />
                            <span className="font-medium text-white">
                              {debt.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="border-white/5 text-[10px] capitalize text-zinc-400"
                            >
                              {debt.type}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="bg-zinc-700/40 text-[10px] text-zinc-300"
                            >
                              {debt.payoffStrategy}
                            </Badge>
                          </div>
                          <div className="text-xs text-zinc-500">
                            APR {debt.apr}% · Minimum{" "}
                            {formatCurrency(debt.minimumPayment)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold text-white">
                              {formatCurrency(debt.balance)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              Balance
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-white"
                              onClick={() => openDebtEdit(debt)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-red-400"
                              onClick={() => deleteDebt.mutate(debt.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-zinc-700/40 text-white hover:bg-zinc-700/60"
                          onClick={() => {
                            setPaymentDebtId(debt.id);
                            paymentForm.reset({ amount: 0 });
                          }}
                        >
                          <DollarSign className="mr-1 h-3 w-3" />
                          Add Payment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {advisor && advisor.payoffOrder.length > 0 && (
                <Card className={cn(glassCard)}>
                  <CardHeader>
                    <CardTitle className="text-base text-white">
                      Recommended Payoff Order
                    </CardTitle>
                    <CardDescription>
                      Sorted by each debt&apos;s chosen strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {advisor.payoffOrder.map((d, idx) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-xl bg-zinc-900/40 p-4 ring-1 ring-white/5 transition-colors hover:bg-zinc-900/60"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-medium text-white">
                                {d.name}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {d.estimatedPayoffDate
                                  ? `Estimated payoff ${format(new Date(d.estimatedPayoffDate), "MMM yyyy")}`
                                  : "Cannot payoff at minimum rate"}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-white">
                              {formatCurrency(d.balance)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {d.apr}% APR
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Goal Dialog ────────────────────────────────── */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="border border-white/5 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingGoal ? "Edit Goal" : "New Savings Goal"}
            </DialogTitle>
            <DialogDescription>
              {editingGoal
                ? "Update your savings goal details."
                : "Create a new savings goal."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={goalForm.handleSubmit(onGoalSubmit as any)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="g-name">Name</Label>
              <Input
                id="g-name"
                {...goalForm.register("name")}
                className="bg-zinc-800 border border-white/5"
              />
              {goalForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {String(goalForm.formState.errors.name.message)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="g-target">Target Amount</Label>
                <Input
                  id="g-target"
                  type="number"
                  step="0.01"
                  {...goalForm.register("targetAmount")}
                  className="bg-zinc-800 border border-white/5"
                />
                {goalForm.formState.errors.targetAmount && (
                  <p className="text-xs text-destructive">
                    {String(goalForm.formState.errors.targetAmount.message)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-current">Current Amount</Label>
                <Input
                  id="g-current"
                  type="number"
                  step="0.01"
                  {...goalForm.register("currentAmount")}
                  className="bg-zinc-800 border border-white/5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="g-deadline">Deadline</Label>
                <Input
                  id="g-deadline"
                  type="date"
                  {...goalForm.register("deadline")}
                  className="bg-zinc-800 border border-white/5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-priority">Priority (1-5)</Label>
                <Input
                  id="g-priority"
                  type="number"
                  min={1}
                  max={5}
                  {...goalForm.register("priority")}
                  className="bg-zinc-800 border border-white/5"
                />
                {goalForm.formState.errors.priority && (
                  <p className="text-xs text-destructive">
                    {String(goalForm.formState.errors.priority.message)}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"
              >
                {editingGoal ? "Save Changes" : "Create Goal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Contribute Dialog ──────────────────────────── */}
      <Dialog
        open={!!contributeGoalId}
        onOpenChange={(open) => {
          if (!open) {
            setContributeGoalId(null);
            contributeForm.reset();
          }
        }}
      >
        <DialogContent className="border border-white/5 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Contribute to Goal</DialogTitle>
            <DialogDescription>
              Add money toward your savings goal.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={contributeForm.handleSubmit(onContributeSubmit as any)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="c-amount">Amount</Label>
              <Input
                id="c-amount"
                type="number"
                step="0.01"
                {...contributeForm.register("amount")}
                className="bg-zinc-800 border border-white/5"
              />
              {contributeForm.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {String(contributeForm.formState.errors.amount.message)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"
              >
                Contribute
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Debt Dialog ────────────────────────────────── */}
      <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
        <DialogContent className="border border-white/5 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingDebt ? "Edit Debt" : "New Debt"}
            </DialogTitle>
            <DialogDescription>
              {editingDebt
                ? "Update your debt details."
                : "Add a new debt to track."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={debtForm.handleSubmit(onDebtSubmit as any)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="d-name">Name</Label>
              <Input
                id="d-name"
                {...debtForm.register("name")}
                className="bg-zinc-800 border border-white/5"
              />
              {debtForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {String(debtForm.formState.errors.name.message)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="d-type">Type</Label>
              <Input
                id="d-type"
                placeholder="e.g. credit_card, student_loan"
                {...debtForm.register("type")}
                className="bg-zinc-800 border border-white/5"
              />
              {debtForm.formState.errors.type && (
                <p className="text-xs text-destructive">
                  {String(debtForm.formState.errors.type.message)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="d-balance">Balance</Label>
                <Input
                  id="d-balance"
                  type="number"
                  step="0.01"
                  {...debtForm.register("balance")}
                  className="bg-zinc-800 border border-white/5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="d-apr">APR (%)</Label>
                <Input
                  id="d-apr"
                  type="number"
                  step="0.01"
                  {...debtForm.register("apr")}
                  className="bg-zinc-800 border border-white/5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="d-min">Minimum Payment</Label>
                <Input
                  id="d-min"
                  type="number"
                  step="0.01"
                  {...debtForm.register("minimumPayment")}
                  className="bg-zinc-800 border border-white/5"
                />
                {debtForm.formState.errors.minimumPayment && (
                  <p className="text-xs text-destructive">
                    {String(debtForm.formState.errors.minimumPayment.message)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="d-strategy">Strategy</Label>
                <Controller
                  control={debtForm.control}
                  name="payoffStrategy"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="d-strategy"
                        className="bg-zinc-800 border border-white/5"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border border-white/5 bg-zinc-800">
                        <SelectItem
                          value="AVALANCHE"
                          className="focus:bg-zinc-700"
                        >
                          Avalanche
                        </SelectItem>
                        <SelectItem
                          value="SNOWBALL"
                          className="focus:bg-zinc-700"
                        >
                          Snowball
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"
              >
                {editingDebt ? "Save Changes" : "Create Debt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Payment Dialog ─────────────────────────────── */}
      <Dialog
        open={!!paymentDebtId}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentDebtId(null);
            paymentForm.reset();
          }
        }}
      >
        <DialogContent className="border border-white/5 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Record Extra Payment</DialogTitle>
            <DialogDescription>
              Reduce your debt balance with an extra payment.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={paymentForm.handleSubmit(onPaymentSubmit as any)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="p-amount">Amount</Label>
              <Input
                id="p-amount"
                type="number"
                step="0.01"
                {...paymentForm.register("amount")}
                className="bg-zinc-800 border border-white/5"
              />
              {paymentForm.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {String(paymentForm.formState.errors.amount.message)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"
              >
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Settings Dialog ────────────────────────────── */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="border border-white/5 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Advisor Settings</DialogTitle>
            <DialogDescription>
              Adjust your income frequency, savings target, and fixed expenses.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={settingsForm.handleSubmit(onSettingsSubmit as any)}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="s-freq">Income Frequency</Label>
              <Controller
                control={settingsForm.control}
                name="incomeFrequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="s-freq"
                      className="bg-zinc-800 border border-white/5"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border border-white/5 bg-zinc-800">
                      {[
                        "DAILY",
                        "WEEKLY",
                        "BIWEEKLY",
                        "MONTHLY",
                        "YEARLY",
                      ].map((f) => (
                        <SelectItem
                          key={f}
                          value={f}
                          className="focus:bg-zinc-700"
                        >
                          {f.charAt(0) + f.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-target">Target Savings Rate (0-1)</Label>
              <Input
                id="s-target"
                type="number"
                step="0.01"
                min={0}
                max={1}
                {...settingsForm.register("targetRate")}
                className="bg-zinc-800 border border-white/5"
              />
              {settingsForm.formState.errors.targetRate && (
                <p className="text-xs text-destructive">
                  {String(settingsForm.formState.errors.targetRate.message)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-fixed">Fixed Expenses Override</Label>
              <Input
                id="s-fixed"
                type="number"
                step="0.01"
                min={0}
                {...settingsForm.register("fixedExpenses")}
                className="bg-zinc-800 border border-white/5"
              />
              <p className="text-xs text-zinc-400">
                Debt minimums are added automatically.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"
              >
                Save Settings
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
