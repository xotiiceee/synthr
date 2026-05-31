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
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Wallet className="mx-auto mb-4 size-8 text-[#00d4aa]" />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Let&apos;s set up your finances
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            A few quick steps to personalize your synthr experience
          </p>
        </div>

        {/* Step Dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex size-3 rounded-full transition-all duration-300",
                  i < step && "bg-[#00d4aa] shadow-[0_0_8px_rgba(0,212,170,0.5)]",
                  i === step && "bg-[#00d4aa] shadow-[0_0_12px_rgba(0,212,170,0.7)]",
                  i > step && "bg-zinc-700"
                )}
              />
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8 rounded-full transition-colors duration-300",
                    i < step ? "bg-[#00d4aa]" : "bg-zinc-700"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content Card */}
        <Card className="border-white/5 bg-[#18181b]">
          <CardHeader>
            <CardTitle className="text-xl text-white">
              {step === 0 && "Your Accounts"}
              {step === 1 && "How do you get paid?"}
              {step === 2 && "You're all set!"}
            </CardTitle>
            <CardDescription className="text-zinc-400">
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
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Step 0: Accounts */}
              {step === 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Checking */}
                  <div className="rounded-xl border border-white/5 bg-[#18181b] p-5">
                    <div className="mb-4 flex items-center gap-2 text-[#00d4aa]">
                      <Landmark className="size-5" />
                      <span className="text-sm font-semibold">
                        Checking Account
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkingName" className="text-zinc-400">
                          Account Name
                        </Label>
                        <Input
                          id="checkingName"
                          className="bg-[#18181b] border-white/10 text-white placeholder:text-zinc-400 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                          {...register("checkingName")}
                        />
                        {errors.checkingName && (
                          <p className="text-xs text-red-400">
                            {errors.checkingName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkingBalance" className="text-zinc-400">
                          Current Balance
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                          <Input
                            id="checkingBalance"
                            type="number"
                            step="0.01"
                            className="pl-8 bg-[#18181b] border-white/10 text-white placeholder:text-zinc-400 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                            {...register("checkingBalance")}
                          />
                        </div>
                        {errors.checkingBalance && (
                          <p className="text-xs text-red-400">
                            {errors.checkingBalance.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Savings */}
                  <div className="rounded-xl border border-white/5 bg-[#18181b] p-5">
                    <div className="mb-4 flex items-center gap-2 text-[#00d4aa]">
                      <Landmark className="size-5" />
                      <span className="text-sm font-semibold">
                        Savings Account
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="savingsName" className="text-zinc-400">
                          Account Name
                        </Label>
                        <Input
                          id="savingsName"
                          className="bg-[#18181b] border-white/10 text-white placeholder:text-zinc-400 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                          {...register("savingsName")}
                        />
                        {errors.savingsName && (
                          <p className="text-xs text-red-400">
                            {errors.savingsName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="savingsBalance" className="text-zinc-400">
                          Current Balance
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                          <Input
                            id="savingsBalance"
                            type="number"
                            step="0.01"
                            className="pl-8 bg-[#18181b] border-white/10 text-white placeholder:text-zinc-400 focus-visible:border-[#00d4aa] focus-visible:ring-[#00d4aa]/30"
                            {...register("savingsBalance")}
                          />
                        </div>
                        {errors.savingsBalance && (
                          <p className="text-xs text-red-400">
                            {errors.savingsBalance.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Income Frequency */}
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
                                "relative flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-[#18181b] p-6 text-center transition-all hover:bg-[#1c1c1f]",
                                isSelected &&
                                  "border-[#00d4aa] bg-[#00d4aa]/5 shadow-[0_0_20px_rgba(0,212,170,0.15)]"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex size-12 items-center justify-center rounded-full transition-colors",
                                  isSelected
                                    ? "bg-[#00d4aa]/10 text-[#00d4aa]"
                                    : "bg-zinc-800 text-zinc-400"
                                )}
                              >
                                <Icon className="size-6" />
                              </div>
                              <div>
                                <div
                                  className={cn(
                                    "text-sm font-semibold",
                                    isSelected ? "text-[#00d4aa]" : "text-white"
                                  )}
                                >
                                  {option.label}
                                </div>
                                <div className="text-xs text-zinc-400">
                                  {option.sub}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute right-3 top-3">
                                  <CheckCircle2 className="size-5 text-[#00d4aa]" />
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

              {/* Step 2: Complete */}
              {step === 2 && (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-[#00d4aa]/10 shadow-[0_0_30px_rgba(0,212,170,0.2)]">
                    <CheckCircle2 className="size-10 text-[#00d4aa]" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-white">
                    You&apos;re all set!
                  </h3>
                  <p className="max-w-sm text-zinc-400">
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
                    className="border-white/10 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"
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
                    className="gap-1 h-11 bg-[#00d4aa] text-black font-semibold rounded-lg hover:bg-[#00b894] hover:shadow-[0_0_24px_rgba(0,212,170,0.35)] transition-all"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="gap-1 h-11 bg-[#00d4aa] text-black font-semibold rounded-lg hover:bg-[#00b894] hover:shadow-[0_0_24px_rgba(0,212,170,0.35)] transition-all"
                  >
                    {loading ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        Finish Setup
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
