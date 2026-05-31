"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Landmark,
  DollarSign,
  Calendar,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  Check,
  ChevronRight,
  Wallet,
} from "lucide-react";

const setupSchema = z.object({
  checkingName: z.string().min(1, "Account name required"),
  checkingBalance: z.string().min(1, "Balance required"),
  savingsName: z.string().min(1, "Account name required"),
  savingsBalance: z.string().min(1, "Balance required"),
  incomeFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
});

type SetupData = z.infer<typeof setupSchema>;

const steps = [
  { id: "accounts", label: "Accounts" },
  { id: "income", label: "Income" },
  { id: "complete", label: "Complete" },
];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<SetupData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      checkingName: "Checking",
      checkingBalance: "",
      savingsName: "Savings",
      savingsBalance: "",
      incomeFrequency: "MONTHLY",
    },
  });

  const onSubmit = async (data: SetupData) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || "Setup failed. Please try again.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-primary/10 p-3 ring-1 ring-primary/20">
            <Wallet className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Let&apos;s set up your finances
          </h1>
          <p className="mt-2 text-muted-foreground">
            A few quick steps to personalize your synthr experience
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-6">
          <div className="flex w-full items-center">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className="flex flex-1 items-center last:flex-none"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all sm:size-10",
                      i < step &&
                        "border-primary bg-primary text-primary-foreground",
                      i === step &&
                        "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(0,212,170,0.3)]",
                      i > step &&
                        "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {i < step ? (
                      <Check className="size-4 sm:size-5" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-[10px] font-medium sm:text-xs",
                      i <= step ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1 rounded-full sm:mx-4",
                      i < step ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Segmented Progress */}
          <div className="mt-4 flex w-full gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  i <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Content Card */}
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 0 && "Your Accounts"}
              {step === 1 && "How do you get paid?"}
              {step === 2 && "You're all set!"}
            </CardTitle>
            <CardDescription>
              {step === 0 &&
                "Add your checking and savings accounts to get started."}
              {step === 1 &&
                "Select your income frequency so we can forecast your cash flow."}
              {step === 2 &&
                "We'll analyze your spending and help you save smarter."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Step 1: Accounts */}
              {step === 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Checking */}
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                    <div className="mb-4 flex items-center gap-2 text-primary">
                      <Landmark className="size-5" />
                      <span className="text-sm font-semibold">
                        Checking Account
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkingName">Account Name</Label>
                        <Input
                          id="checkingName"
                          {...register("checkingName")}
                        />
                        {errors.checkingName && (
                          <p className="text-xs text-destructive">
                            {errors.checkingName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkingBalance">
                          Current Balance
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="checkingBalance"
                            type="number"
                            step="0.01"
                            className="pl-8"
                            {...register("checkingBalance")}
                          />
                        </div>
                        {errors.checkingBalance && (
                          <p className="text-xs text-destructive">
                            {errors.checkingBalance.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Savings */}
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                    <div className="mb-4 flex items-center gap-2 text-primary">
                      <Landmark className="size-5" />
                      <span className="text-sm font-semibold">
                        Savings Account
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="savingsName">Account Name</Label>
                        <Input
                          id="savingsName"
                          {...register("savingsName")}
                        />
                        {errors.savingsName && (
                          <p className="text-xs text-destructive">
                            {errors.savingsName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="savingsBalance">
                          Current Balance
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="savingsBalance"
                            type="number"
                            step="0.01"
                            className="pl-8"
                            {...register("savingsBalance")}
                          />
                        </div>
                        {errors.savingsBalance && (
                          <p className="text-xs text-destructive">
                            {errors.savingsBalance.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Income Preferences */}
              {step === 1 && (
                <div className="space-y-6">
                  <Controller
                    name="incomeFrequency"
                    control={control}
                    render={({ field }) => (
                      <div className="grid gap-4 sm:grid-cols-3">
                        {[
                          {
                            value: "WEEKLY",
                            label: "Weekly",
                            sub: "Paid every week",
                            icon: Calendar,
                          },
                          {
                            value: "BIWEEKLY",
                            label: "Bi-weekly",
                            sub: "Paid every 2 weeks",
                            icon: CalendarDays,
                          },
                          {
                            value: "MONTHLY",
                            label: "Monthly",
                            sub: "Paid once a month",
                            icon: CalendarCheck,
                          },
                        ].map((option) => {
                          const Icon = option.icon;
                          const isSelected = field.value === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => field.onChange(option.value)}
                              className={cn(
                                "relative flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition-all hover:bg-muted/50 sm:p-6",
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(0,212,170,0.15)]"
                                  : "border-border bg-card"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex size-12 items-center justify-center rounded-full transition-colors",
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                <Icon className="size-6" />
                              </div>
                              <div>
                                <div
                                  className={cn(
                                    "text-sm font-semibold",
                                    isSelected
                                      ? "text-primary"
                                      : "text-foreground"
                                  )}
                                >
                                  {option.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {option.sub}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute right-3 top-3">
                                  <CheckCircle2 className="size-5 text-primary" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>
              )}

              {/* Step 3: Complete */}
              {step === 2 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/10 shadow-[0_0_30px_rgba(0,212,170,0.2)]">
                    <CheckCircle2 className="size-10 text-primary" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-foreground">
                    You&apos;re all set!
                  </h3>
                  <p className="max-w-sm text-muted-foreground">
                    We&apos;ll analyze your spending and help you save smarter.
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={loading}
                  >
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="gap-1"
                  >
                    {loading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Launch synthr
                        <ChevronRight className="size-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
