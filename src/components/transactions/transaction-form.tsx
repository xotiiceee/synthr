"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { TransactionType } from "@prisma/client";

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
  tags: { tagId: string; tag: Tag }[];
}

const formSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.coerce.number<number>().positive("Amount must be positive"),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  toAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

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

async function fetchTags(): Promise<Tag[]> {
  const res = await fetch("/api/tags");
  if (!res.ok) throw new Error("Failed to fetch tags");
  return res.json();
}

async function createTransaction(data: FormData & { date: string }) {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      date: new Date(data.date).toISOString(),
    }),
  });
  if (!res.ok) throw new Error("Failed to create transaction");
  return res.json();
}

async function updateTransaction(
  id: string,
  data: FormData & { date: string }
) {
  const res = await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      date: new Date(data.date).toISOString(),
    }),
  });
  if (!res.ok) throw new Error("Failed to update transaction");
  return res.json();
}

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
}

export function TransactionForm({
  open,
  onOpenChange,
  editingTransaction,
}: TransactionFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editingTransaction;

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  const accounts = accountsData?.accounts ?? [];
  const categories = categoriesData ?? [];
  const tags = tagsData ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "EXPENSE",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      description: "",
      notes: "",
      accountId: "",
      toAccountId: "",
      categoryId: "",
      tagIds: [],
    },
  });

  const selectedType = watch("type");
  const selectedTagIds = watch("tagIds") ?? [];

  useEffect(() => {
    if (editingTransaction) {
      reset({
        type: editingTransaction.type,
        amount: Number(editingTransaction.amount),
        date: new Date(editingTransaction.date).toISOString().split("T")[0],
        description: editingTransaction.description,
        notes: editingTransaction.notes ?? "",
        accountId: editingTransaction.accountId,
        toAccountId: editingTransaction.toAccountId ?? "",
        categoryId: editingTransaction.categoryId ?? "",
        tagIds: editingTransaction.tags.map((t) => t.tagId),
      });
    } else {
      reset({
        type: "EXPENSE",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        description: "",
        notes: "",
        accountId: "",
        toAccountId: "",
        categoryId: "",
        tagIds: [],
      });
    }
  }, [editingTransaction, reset]);

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData & { date: string }) =>
      updateTransaction(editingTransaction!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false);
      reset();
    },
  });

  function onSubmit(data: FormData) {
    if (data.type === "TRANSFER" && !data.toAccountId) {
      return;
    }
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  function toggleTag(tagId: string) {
    const current = watch("tagIds") ?? [];
    if (current.includes(tagId)) {
      setValue(
        "tagIds",
        current.filter((id) => id !== tagId)
      );
    } else {
      setValue("tagIds", [...current, tagId]);
    }
  }

  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || selectedType === "TRANSFER"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your transaction details."
                : "Record a new income, expense, or transfer."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register("date")} />
                {errors.date && (
                  <p className="text-xs text-destructive">
                    {errors.date.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="e.g. Grocery shopping"
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                {...register("notes")}
                placeholder="Optional notes..."
              />
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label htmlFor="accountId">
                {selectedType === "TRANSFER" ? "From Account" : "Account"}
              </Label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="accountId">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.accountId && (
                <p className="text-xs text-destructive">
                  {errors.accountId.message}
                </p>
              )}
            </div>

            {/* To Account (transfer only) */}
            {selectedType === "TRANSFER" && (
              <div className="space-y-2">
                <Label htmlFor="toAccountId">To Account</Label>
                <Controller
                  name="toAccountId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="toAccountId">
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts
                          .filter((a) => a.id !== watch("accountId"))
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    No tags available.
                  </span>
                )}
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs border transition-colors",
                        isSelected
                          ? "bg-[#00d4aa] text-[#0f172a] border-[#00d4aa]"
                          : "bg-transparent text-muted-foreground border-border hover:border-[#00d4aa]/50"
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {isEditing ? (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
