"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const setupSchema = z.object({
  checkingName: z.string().min(1, "Account name required"),
  checkingBalance: z.string().min(1, "Balance required"),
  savingsName: z.string().min(1, "Account name required"),
  savingsBalance: z.string().min(1, "Balance required"),
  incomeFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
});

type SetupData = z.infer<typeof setupSchema>;

const steps = ["Accounts", "Preferences", "Done"];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, control, formState: { errors }, watch } = useForm<SetupData>({
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
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to synthr</CardTitle>
          <CardDescription>Let&apos;s set up your finance tracker</CardDescription>
          <Progress value={((step + 1) / steps.length) * 100} className="mt-2" />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Your Accounts</h3>
                <div className="grid gap-4 rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkingName">Checking Account Name</Label>
                    <Input id="checkingName" {...register("checkingName")} />
                    {errors.checkingName && <p className="text-sm text-red-500">{errors.checkingName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkingBalance">Current Balance</Label>
                    <Input id="checkingBalance" type="number" step="0.01" {...register("checkingBalance")} />
                    {errors.checkingBalance && <p className="text-sm text-red-500">{errors.checkingBalance.message}</p>}
                  </div>
                </div>
                <div className="grid gap-4 rounded-lg border border-border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="savingsName">Savings Account Name</Label>
                    <Input id="savingsName" {...register("savingsName")} />
                    {errors.savingsName && <p className="text-sm text-red-500">{errors.savingsName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="savingsBalance">Current Balance</Label>
                    <Input id="savingsBalance" type="number" step="0.01" {...register("savingsBalance")} />
                    {errors.savingsBalance && <p className="text-sm text-red-500">{errors.savingsBalance.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Income & Preferences</h3>
                <div className="space-y-2">
                  <Label>Income Frequency</Label>
                  <Controller
                    name="incomeFrequency"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 text-center">
                <h3 className="font-semibold">You&apos;re all set!</h3>
                <p className="text-muted-foreground">
                  We&apos;ll create your accounts, set up default categories, and configure your savings advisor.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button type="button" className="ml-auto" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" className="ml-auto" disabled={loading}>
                  {loading ? "Setting up..." : "Finish Setup"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
