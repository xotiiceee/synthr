"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
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
  DialogTrigger,
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
  ProgressLabel,
  ProgressValue,
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Target,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Shield,
  CreditCard,
} from "lucide-react";

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
    isLoading: advisorLoading,
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
  const statusColor =
    advisor?.status === "On Track"
      ? "text-emerald-600 bg-emerald-50 ring-emerald-200"
      : advisor?.status === "Getting There"
      ? "text-amber-600 bg-amber-50 ring-amber-200"
      : "text-rose-600 bg-rose-50 ring-rose-200";

  const statusIcon =
    advisor?.status === "On Track" ? (
      <CheckCircle2 className="h-8 w-8 text-emerald-600" />
    ) : advisor?.status === "Getting There" ? (
      <TrendingUp className="h-8 w-8 text-amber-600" />
    ) : (
      <AlertTriangle className="h-8 w-8 text-rose-600" />
    );

  const allocationData = advisor
    ? [
        { name: "Debt Payoff", value: advisor.allocations.debt },
        { name: "Savings Goals", value: advisor.allocations.goals },
      ].filter((d) => d.value > 0)
    : [];

  const COLORS = ["#f59e0b", "#10b981"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Savings Advisor</h1>
          <p className="text-muted-foreground">
            Smart recommendations to maximize your savings.
          </p>
        </div>
        <Button variant="outline" onClick={openSettings}>
          Settings
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="advisor">Advisor</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="debts">Debts</TabsTrigger>
        </TabsList>

        {/* ─── ADVISOR TAB ────────────────────────────────── */}
        <TabsContent value="advisor" className="space-y-6">
          {/* Status Card */}
          <Card className={`ring-1 ${statusColor}`}>
            <CardContent className="flex items-center gap-4 py-6">
              {statusIcon}
              <div>
                <div className="text-lg font-semibold">
                  {advisor?.status ?? "Loading…"}
                </div>
                <div className="text-sm opacity-80">
                  Actual savings rate: {advisor ? formatPercent(advisor.actualSavingsRate) : "—"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Income</CardDescription>
                <CardTitle className="text-2xl">
                  {advisor ? formatCurrency(advisor.avgIncome) : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  per {advisor?.incomeFrequency.toLowerCase() ?? "month"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Fixed Expenses</CardDescription>
                <CardTitle className="text-2xl">
                  {advisor ? formatCurrency(advisor.fixedExpenses) : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Including minimum debt payments
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Recommended Savings</CardDescription>
                <CardTitle className="text-2xl">
                  {advisor ? formatCurrency(advisor.recommendedSavings) : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Target rate applied to income
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Safe to Spend</CardDescription>
                <CardTitle className="text-2xl">
                  {advisor ? formatCurrency(advisor.safeToSpend) : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  After savings and fixed costs
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Savings Rate Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Actual Savings Rate vs. Target</CardTitle>
              <CardDescription>
                Target is {advisor ? formatPercent(advisor.targetRate ?? 0.2) : "20%"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {advisor && (
                <>
                  <Progress
                    value={Math.min(advisor.actualSavingsRate * 100, 100)}
                    className="w-full"
                  >
                    <ProgressLabel>Progress</ProgressLabel>
                    <ProgressValue>
                      {() => formatPercent(advisor.actualSavingsRate)}
                    </ProgressValue>
                  </Progress>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0%</span>
                    <span>Target: {advisor ? formatPercent(advisor.targetRate ?? 0.2) : "20%"}</span>
                    <span>100%</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Allocations & Payoff Order */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recommended Allocation</CardTitle>
                <CardDescription>
                  How to split your recommended savings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {advisor && allocationData.length > 0 ? (
                  <>
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
                            label={((props: any) =>
                              `${props.name}: ${formatCurrency(props.value)}`) as any}
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
                    <div className="space-y-2 text-sm">
                      {allocationData.map((item, idx) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{
                                backgroundColor:
                                  COLORS[idx % COLORS.length],
                              }}
                            />
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No allocation recommendation yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payoff Recommendation</CardTitle>
                <CardDescription>
                  Recommended order to eliminate debts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {advisor && advisor.payoffOrder.length > 0 ? (
                  <div className="space-y-3">
                    {advisor.payoffOrder.map((d, idx) => (
                      <div
                        key={d.id}
                        className="flex items-start justify-between rounded-lg border p-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <span className="font-medium">{d.name}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {d.payoffStrategy.toLowerCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            APR {d.apr}% · Min {formatCurrency(d.minimumPayment)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(d.balance)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {d.estimatedPayoffDate
                              ? `Payoff ${format(new Date(d.estimatedPayoffDate), "MMM yyyy")}`
                              : "Never at minimum"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No debts to display.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── GOALS TAB ─────────────────────────────────── */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Savings Goals</h2>
            <Button onClick={openGoalCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </div>

          {goalsLoading ? (
            <div className="text-muted-foreground">Loading goals…</div>
          ) : goals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No savings goals yet. Create one to get started.
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
                  <Card key={goal.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{goal.name}</CardTitle>
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
                            size="icon-xs"
                            onClick={() => openGoalEdit(goal)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => deleteGoal.mutate(goal.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-3">
                      <Progress value={pct} className="w-full">
                        <ProgressLabel>Progress</ProgressLabel>
                        <ProgressValue>{() => `${pct}%`}</ProgressValue>
                      </Progress>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="secondary"
                        className="w-full"
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
            <h2 className="text-lg font-semibold">Debt Tracking</h2>
            <Button onClick={openDebtCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Debt
            </Button>
          </div>

          {debtsLoading ? (
            <div className="text-muted-foreground">Loading debts…</div>
          ) : debts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No debts tracked yet. Add one to see payoff recommendations.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {debts.map((debt) => (
                  <Card key={debt.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{debt.name}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {debt.type}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {debt.payoffStrategy}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            APR {debt.apr}% · Minimum {formatCurrency(debt.minimumPayment)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency(debt.balance)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Balance
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openDebtEdit(debt)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => deleteDebt.mutate(debt.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
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
                <Card>
                  <CardHeader>
                    <CardTitle>Recommended Payoff Order</CardTitle>
                    <CardDescription>
                      Sorted by each debt&apos;s chosen strategy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {advisor.payoffOrder.map((d, idx) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-medium">{d.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {d.estimatedPayoffDate
                                  ? `Estimated payoff ${format(new Date(d.estimatedPayoffDate), "MMM yyyy")}`
                                  : "Cannot payoff at minimum rate"}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div>{formatCurrency(d.balance)}</div>
                            <div className="text-xs text-muted-foreground">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
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
              <Input id="g-name" {...goalForm.register("name")} />
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
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="g-deadline">Deadline</Label>
                <Input id="g-deadline" type="date" {...goalForm.register("deadline")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-priority">Priority (1-5)</Label>
                <Input
                  id="g-priority"
                  type="number"
                  min={1}
                  max={5}
                  {...goalForm.register("priority")}
                />
                {goalForm.formState.errors.priority && (
                  <p className="text-xs text-destructive">
                    {String(goalForm.formState.errors.priority.message)}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribute to Goal</DialogTitle>
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
              />
              {contributeForm.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {String(contributeForm.formState.errors.amount.message)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit">Contribute</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Debt Dialog ────────────────────────────────── */}
      <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
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
              <Input id="d-name" {...debtForm.register("name")} />
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
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="d-apr">APR (%)</Label>
                <Input
                  id="d-apr"
                  type="number"
                  step="0.01"
                  {...debtForm.register("apr")}
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
                      <SelectTrigger id="d-strategy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVALANCHE">Avalanche</SelectItem>
                        <SelectItem value="SNOWBALL">Snowball</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Extra Payment</DialogTitle>
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
              />
              {paymentForm.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {String(paymentForm.formState.errors.amount.message)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Settings Dialog ────────────────────────────── */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Advisor Settings</DialogTitle>
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
                    <SelectTrigger id="s-freq">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
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
              />
              <p className="text-xs text-muted-foreground">
                Debt minimums are added automatically.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit">Save Settings</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
