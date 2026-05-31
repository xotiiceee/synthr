"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, subMonths } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight, TrendingDown, Receipt, Repeat, Clock, ArrowUpRight, ArrowDownRight, Plus, Trash2 } from "lucide-react";

const billSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required"),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]),
  accountId: z.string().min(1, "Account is required"),
  startDate: z.string().min(1, "Start date is required"),
});

type BillForm = z.infer<typeof billSchema>;

function getMonthLabel(date: Date) { return format(date, "MMMM yyyy"); }
function getMonthParam(date: Date) { return format(date, "yyyy-MM"); }

export default function MonthlyExpensesPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["monthly-expenses", getMonthParam(currentMonth)],
    queryFn: async () => {
      const res = await fetch(`/api/monthly-expenses?month=${getMonthParam(currentMonth)}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      return json.accounts || [];
    },
  });

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<BillForm>({
    resolver: zodResolver(billSchema),
    defaultValues: { startDate: format(new Date(), "yyyy-MM-dd") },
  });

  const addBill = useMutation({
    mutationFn: async (data: BillForm) => {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, amount: parseFloat(data.amount), type: "EXPENSE" }),
      });
      if (!res.ok) throw new Error("Failed to add bill");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      setAddOpen(false);
      reset();
      toast.success("Recurring bill added");
    },
    onError: () => toast.error("Failed to add bill"),
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-expenses"] });
      toast.success("Bill removed");
    },
  });

  const prevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Expenses</h1>
          <p className="text-zinc-400">Track where your money goes each month</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="border-white/5 bg-zinc-900">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-40 text-center font-semibold">{getMonthLabel(currentMonth)}</span>
          <Button variant="outline" size="icon" onClick={nextMonth} className="border-white/5 bg-zinc-900">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-zinc-900 rounded-xl animate-pulse border border-white/5" />)}</div>
      ) : !data ? (
        <div className="flex items-center justify-center py-20 text-zinc-400">No data available</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Expenses", value: data.totalExpenses, icon: TrendingDown, color: "text-red-400", sub: `${data.transactionCount} transactions` },
              { label: "Recurring Bills", value: data.recurringTotal, icon: Repeat, color: "text-amber-400", sub: `${data.recurringRules.length} active bills` },
              { label: "One-Time", value: (data.totalExpenses - data.recurringTotal), icon: Receipt, color: "text-emerald-400", sub: "non-recurring" },
              { label: "vs Last Month", value: Math.abs(data.change), icon: Clock, color: data.change > 0 ? "text-red-400" : "text-green-400", sub: `from ${formatCurrency(data.lastMonthTotal)}`, prefix: data.change > 0 ? "↑" : "↓", isPct: true },
            ].map((card) => (
              <Card key={card.label} className="bg-zinc-900 border-white/5 rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">{card.label}</CardTitle>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${card.color}`}>
                    {card.isPct ? `${card.prefix}${card.value}%` : formatCurrency(card.value)}
                  </div>
                  <p className="text-xs text-zinc-500">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-zinc-900 border-white/5 rounded-xl">
              <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
              <CardContent>
                {data.categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-zinc-400">No expenses this month</p>
                ) : (
                  <div className="space-y-3">
                    {data.categoryBreakdown.map((cat: any) => {
                      const pct = data.totalExpenses > 0 ? (cat.total / data.totalExpenses) * 100 : 0;
                      return (
                        <div key={cat.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || "#00d4aa" }} />
                              <span className="text-zinc-300">{cat.name}</span>
                            </span>
                            <span className="font-medium">{formatCurrency(cat.total)}</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cat.color || "#00d4aa" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-white/5 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recurring Bills</CardTitle>
                <Button size="sm" onClick={() => setAddOpen(true)} className="bg-[#00d4aa] text-black font-semibold hover:shadow-[0_0_20px_rgba(0,212,170,0.15)]">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent>
                {data.recurringRules.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-zinc-400">No recurring bills set up</p>
                    <Button variant="link" onClick={() => setAddOpen(true)} className="text-[#00d4aa] mt-2">Add your first recurring bill</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recurringRules.map((rule: any) => (
                      <div key={rule.id} className="flex items-center justify-between rounded-lg border border-white/5 p-3 hover:bg-zinc-800/50 transition-colors group">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-4 border-white/10 text-zinc-400">{rule.frequency}</Badge>
                            {rule.nextRun && <span className="text-xs text-zinc-500">Next: {format(new Date(rule.nextRun), "MMM d")}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-amber-400">{formatCurrency(rule.amount)}</span>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400"
                            onClick={() => deleteBill.mutate(rule.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="bg-zinc-900 border-white/5 sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Recurring Bill</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit((d) => addBill.mutate(d))} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Bill Name</Label>
                  <Input {...register("name")} placeholder="e.g. Netflix, Rent" className="bg-zinc-950 border-white/10" />
                  {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Amount</Label>
                    <Input {...register("amount")} type="text" inputMode="decimal" placeholder="0.00" className="bg-zinc-950 border-white/10" />
                    {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Frequency</Label>
                    <Select onValueChange={(v) => setValue("frequency", v as any)} defaultValue="MONTHLY">
                      <SelectTrigger className="bg-zinc-950 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Start Date</Label>
                    <Input {...register("startDate")} type="date" className="bg-zinc-950 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Account</Label>
                    <Select onValueChange={(v) => setValue("accountId", String(v || ""))}>
                      <SelectTrigger className="bg-zinc-950 border-white/10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {accounts?.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.accountId && <p className="text-xs text-red-400">{errors.accountId.message}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#00d4aa] text-black font-semibold">Add Bill</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
