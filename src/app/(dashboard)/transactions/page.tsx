"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { TransactionType, CategoryType } from "@prisma/client";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Filter,
} from "lucide-react";

/* ─── Types ─── */
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

interface TagItem {
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
  tags: { tagId: string; tag: TagItem }[];
}

/* ─── Fetchers ─── */
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

async function fetchTags(): Promise<TagItem[]> {
  const res = await fetch("/api/tags");
  if (!res.ok) throw new Error("Failed to fetch tags");
  return res.json();
}

async function deleteTransaction(id: string) {
  const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete transaction");
  return res.json();
}

/* ─── Form ─── */
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

async function createTransaction(data: FormData & { date: string }) {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, date: new Date(data.date).toISOString() }),
  });
  if (!res.ok) throw new Error("Failed to create transaction");
  return res.json();
}

async function updateTransaction(id: string, data: FormData & { date: string }) {
  const res = await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, date: new Date(data.date).toISOString() }),
  });
  if (!res.ok) throw new Error("Failed to update transaction");
  return res.json();
}

/* ─── Category helpers ─── */
async function createCategory(data: { name: string; type: CategoryType; color?: string; icon?: string }) {
  const res = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

async function createTag(data: { name: string; color?: string }) {
  const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed to create tag");
  return res.json();
}

async function deleteCategory(id: string) {
  const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete category");
  return res.json();
}

async function deleteTag(id: string) {
  const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete tag");
  return res.json();
}

/* ─── TransactionDialog ─── */
function TransactionDialog({
  open,
  onOpenChange,
  editingTransaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction: Transaction | null;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!editingTransaction;

  const { data: accountsData } = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const { data: categoriesData } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: tagsData } = useQuery({ queryKey: ["tags"], queryFn: fetchTags });

  const accounts = accountsData?.accounts ?? [];
  const categories = categoriesData ?? [];
  const tags = tagsData ?? [];

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "EXPENSE", amount: 0, date: new Date().toISOString().split("T")[0],
      description: "", notes: "", accountId: "", toAccountId: "", categoryId: "", tagIds: [],
    },
  });

  const selectedType = watch("type");
  const selectedTagIds = (watch("tagIds") as string[]) ?? [];

  useEffect(() => {
    if (editingTransaction) {
      reset({
        type: editingTransaction.type, amount: Number(editingTransaction.amount),
        date: new Date(editingTransaction.date).toISOString().split("T")[0],
        description: editingTransaction.description, notes: editingTransaction.notes ?? "",
        accountId: editingTransaction.accountId, toAccountId: editingTransaction.toAccountId ?? "",
        categoryId: editingTransaction.categoryId ?? "", tagIds: editingTransaction.tags.map((t) => t.tagId),
      });
    } else {
      reset({
        type: "EXPENSE", amount: 0, date: new Date().toISOString().split("T")[0],
        description: "", notes: "", accountId: "", toAccountId: "", categoryId: "", tagIds: [],
      });
    }
  }, [editingTransaction, reset]);

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false); reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData & { date: string }) => updateTransaction(editingTransaction!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onOpenChange(false); reset();
    },
  });

  function onSubmit(data: FormData) {
    if (data.type === "TRANSFER" && !data.toAccountId) return;
    if (isEditing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  }

  function toggleTag(tagId: string) {
    const current = (watch("tagIds") as string[]) ?? [];
    if (current.includes(tagId)) setValue("tagIds", current.filter((id) => id !== tagId));
    else setValue("tagIds", [...current, tagId]);
  }

  const filteredCategories = categories.filter((c) => c.type === selectedType || selectedType === "TRANSFER");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-white/5 rounded-xl shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="text-white">{isEditing ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
            <DialogDescription>{isEditing ? "Update your transaction details." : "Record a new income, expense, or transfer."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-white">Type</Label>
              <Controller name="type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type" className="bg-zinc-900 border-white/10 text-white focus:ring-[#00d4aa]/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="INCOME" className="text-white focus:bg-white/10">Income</SelectItem>
                    <SelectItem value="EXPENSE" className="text-white focus:bg-white/10">Expense</SelectItem>
                    <SelectItem value="TRANSFER" className="text-white focus:bg-white/10">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              )} />
              {errors.type && <p className="text-xs text-red-400">{errors.type.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-white">Amount</Label>
                <Input id="amount" type="number" step="0.01" {...register("amount", { valueAsNumber: true })} placeholder="0.00" className="bg-zinc-900 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50" />
                {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-white">Date</Label>
                <Input id="date" type="date" {...register("date")} className="bg-zinc-900 border-white/10 text-white focus-visible:ring-[#00d4aa]/50 [color-scheme:dark]" />
                {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Description</Label>
              <Input id="description" {...register("description")} placeholder="e.g. Grocery shopping" className="bg-zinc-900 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50" />
              {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-white">Notes</Label>
              <Input id="notes" {...register("notes")} placeholder="Optional notes..." className="bg-zinc-900 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountId" className="text-white">{selectedType === "TRANSFER" ? "From Account" : "Account"}</Label>
              <Controller name="accountId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="accountId" className="bg-zinc-900 border-white/10 text-white focus:ring-[#00d4aa]/50"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id} className="text-white focus:bg-white/10">{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.accountId && <p className="text-xs text-red-400">{errors.accountId.message}</p>}
            </div>
            {selectedType === "TRANSFER" && (
              <div className="space-y-2">
                <Label htmlFor="toAccountId" className="text-white">To Account</Label>
                <Controller name="toAccountId" control={control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="toAccountId" className="bg-zinc-900 border-white/10 text-white focus:ring-[#00d4aa]/50"><SelectValue placeholder="Select destination account" /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {accounts.filter((a) => a.id !== watch("accountId")).map((acc) => <SelectItem key={acc.id} value={acc.id} className="text-white focus:bg-white/10">{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="categoryId" className="text-white">Category</Label>
              <Controller name="categoryId" control={control} render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="categoryId" className="bg-zinc-900 border-white/10 text-white focus:ring-[#00d4aa]/50"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {filteredCategories.map((cat) => <SelectItem key={cat.id} value={cat.id} className="text-white focus:bg-white/10">{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags available.</span>}
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className={cn("rounded-full px-2.5 py-1 text-xs border transition-colors", isSelected ? "bg-[#00d4aa] text-black border-[#00d4aa]" : "bg-transparent text-muted-foreground border-white/10 hover:border-[#00d4aa]/50")}>
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 shadow-lg shadow-[#00d4aa]/20">
              {isEditing ? <><Pencil className="mr-2 h-4 w-4" />Save Changes</> : <><Plus className="mr-2 h-4 w-4" />Add Transaction</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Page ─── */
export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("transactions");

  const [filterType, setFilterType] = useState<"ALL" | TransactionType>("ALL");
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: transactions, isLoading: txLoading } = useQuery({ queryKey: ["transactions", params], queryFn: () => fetchTransactions(params) });
  const { data: accountsData } = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const { data: categoriesData } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const accounts = accountsData?.accounts ?? [];
  const categories = categoriesData ?? [];
  const rows = transactions ?? [];

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((tx) => tx.description.toLowerCase().includes(q) || (tx.notes && tx.notes.toLowerCase().includes(q)));
  }, [rows, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  function openCreate() { setEditingTransaction(null); setFormOpen(true); }
  function openEdit(tx: Transaction) { setEditingTransaction(tx); setFormOpen(true); }

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<CategoryType>("EXPENSE");
  const [newCatColor, setNewCatColor] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("");

  const { data: allCategories, isLoading: catsLoading } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: allTags, isLoading: tagsLoading } = useQuery({ queryKey: ["tags"], queryFn: fetchTags });

  const createCatMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setNewCatName(""); setNewCatColor(""); setCatDialogOpen(false); },
  });
  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); setNewTagName(""); setNewTagColor(""); setTagDialogOpen(false); },
  });
  const deleteCatMutation = useMutation({ mutationFn: deleteCategory, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }) });
  const deleteTagMutation = useMutation({ mutationFn: deleteTag, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] }) });

  const cats = allCategories ?? [];
  const tagsList = allTags ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Transactions</h1>
          <p className="text-muted-foreground">Manage your income, expenses, and transfers.</p>
        </div>
        <Button onClick={openCreate} className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 shadow-lg shadow-[#00d4aa]/20">
          <Plus className="mr-2 h-4 w-4" />Add Transaction
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-white/5 p-1 rounded-xl">
          <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-[#00d4aa] data-[state=active]:text-black data-[state=active]:shadow-sm">Transactions</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg data-[state=active]:bg-[#00d4aa] data-[state=active]:text-black data-[state=active]:shadow-sm">Categories & Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-6 space-y-6">
          {/* Filter Bar */}
          <div className="rounded-xl bg-zinc-900 border border-white/5 p-4 md:p-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Type</Label>
                <Select value={filterType} onValueChange={(v) => { if (v !== null) setFilterType(v as typeof filterType); }}>
                  <SelectTrigger className="bg-zinc-950 border-white/10 text-white hover:bg-zinc-950/80 focus:ring-[#00d4aa]/50"><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="ALL" className="text-white focus:bg-white/10">All types</SelectItem>
                    <SelectItem value="INCOME" className="text-white focus:bg-white/10">Income</SelectItem>
                    <SelectItem value="EXPENSE" className="text-white focus:bg-white/10">Expense</SelectItem>
                    <SelectItem value="TRANSFER" className="text-white focus:bg-white/10">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Account</Label>
                <Select value={filterAccountId} onValueChange={(v) => { if (v !== null) setFilterAccountId(v); }}>
                  <SelectTrigger className="bg-zinc-950 border-white/10 text-white hover:bg-zinc-950/80 focus:ring-[#00d4aa]/50"><SelectValue placeholder="All accounts" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="" className="text-white focus:bg-white/10">All accounts</SelectItem>
                    {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id} className="text-white focus:bg-white/10">{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Category</Label>
                <Select value={filterCategoryId} onValueChange={(v) => { if (v !== null) setFilterCategoryId(v); }}>
                  <SelectTrigger className="bg-zinc-950 border-white/10 text-white hover:bg-zinc-950/80 focus:ring-[#00d4aa]/50"><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="" className="text-white focus:bg-white/10">All categories</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat.id} value={cat.id} className="text-white focus:bg-white/10">{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">From</Label>
                <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-zinc-950 border-white/10 text-white focus-visible:ring-[#00d4aa]/50 [color-scheme:dark]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">To</Label>
                <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-zinc-950 border-white/10 text-white focus-visible:ring-[#00d4aa]/50 [color-scheme:dark]" />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search transactions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-zinc-950 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50" />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={() => { setFilterType("ALL"); setFilterAccountId(""); setFilterCategoryId(""); setFilterStartDate(""); setFilterEndDate(""); setSearchQuery(""); }} className="text-muted-foreground hover:text-white hover:bg-white/10">Reset Filters</Button>
            </div>
          </div>

          {/* Table */}
          {txLoading ? (
            <div className="rounded-xl bg-zinc-900 border border-white/5 p-8 text-center text-muted-foreground">Loading transactions...</div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/50 p-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 mb-4">
                <Filter className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No transactions yet. Add your first one.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-zinc-900 border border-white/5 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4">Date</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4">Description</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4">Account</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4 text-right">Amount</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4 w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((tx) => {
                    const amount = Number(tx.amount);
                    const isIncome = tx.type === "INCOME";
                    const isExpense = tx.type === "EXPENSE";
                    const amountColor = isIncome ? "text-emerald-400" : isExpense ? "text-red-400" : "text-zinc-400";
                    const sign = isIncome ? "+" : isExpense ? "-" : "";
                    const TypeIcon = isIncome ? ArrowUpRight : isExpense ? ArrowDownRight : ArrowLeftRight;
                    return (
                      <TableRow key={tx.id} className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <TableCell className="py-3 px-4 text-zinc-400 whitespace-nowrap text-sm">{formatDate(tx.date)}</TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-white">{tx.description}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {tx.category && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-0 py-0 px-1.5 text-[10px] font-medium"
                                  style={{ backgroundColor: tx.category.color ? `${tx.category.color}15` : "rgba(0,212,170,0.12)", color: tx.category.color ?? "#00d4aa" }}
                                >
                                  {tx.category.name}
                                </Badge>
                              )}
                              {tx.tags.map((t) => (
                                <span key={t.tagId} className="rounded-full px-1.5 py-px text-[10px] border border-white/10 text-zinc-400 bg-zinc-800/50">
                                  {t.tag.name}
                                </span>
                              ))}
                            </div>
                            {tx.notes && <span className="text-xs text-zinc-500">{tx.notes}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-zinc-300">
                          <div>{tx.account?.name ?? "-"}</div>
                          {tx.toAccountId && <div className="text-xs text-zinc-500 mt-0.5">to {accounts.find((a) => a.id === tx.toAccountId)?.name ?? "-"}</div>}
                        </TableCell>
                        <TableCell className={cn("py-3 px-4 text-right font-semibold tabular-nums", amountColor)}>
                          <div className="flex items-center justify-end gap-1.5"><TypeIcon className={cn("h-3.5 w-3.5", amountColor)} />{sign}{formatCurrency(amount)}</div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(tx)} className="text-zinc-400 hover:text-white hover:bg-white/10"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm("Are you sure you want to delete this transaction?")) deleteMutation.mutate(tx.id); }} className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <TransactionDialog open={formOpen} onOpenChange={setFormOpen} editingTransaction={editingTransaction} />
        </TabsContent>

        <TabsContent value="categories" className="mt-6 space-y-8">
          {/* Categories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Categories</h2>
              <Button size="sm" onClick={() => setCatDialogOpen(true)} className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"><Plus className="mr-1 h-4 w-4" />Add Category</Button>
            </div>
            {catsLoading ? (
              <div className="text-muted-foreground">Loading categories...</div>
            ) : cats.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/50 p-6 text-center text-sm text-muted-foreground">No categories yet.</div>
            ) : (
              <div className="rounded-xl bg-zinc-900 border border-white/5 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/5 hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4">Name</TableHead>
                      <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4">Type</TableHead>
                      <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4">Color</TableHead>
                      <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium py-3 px-4 w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cats.map((cat) => (
                      <TableRow key={cat.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <TableCell className="py-3 px-4 font-medium text-white">{cat.name}</TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className={cn("text-[10px] border-0", cat.type === "INCOME" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>{cat.type}</Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {cat.color ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: cat.color }} />
                              <span className="text-xs text-zinc-400">{cat.color}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm("Are you sure you want to delete this category?")) deleteCatMutation.mutate(cat.id); }} className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Tags</h2>
              <Button size="sm" onClick={() => setTagDialogOpen(true)} className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90"><Tag className="mr-1 h-4 w-4" />Add Tag</Button>
            </div>
            {tagsLoading ? (
              <div className="text-muted-foreground">Loading tags...</div>
            ) : tagsList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/50 p-6 text-center text-sm text-muted-foreground">No tags yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagsList.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                    {tag.color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />}
                    <span>{tag.name}</span>
                    <button type="button" onClick={() => { if (confirm("Are you sure you want to delete this tag?")) deleteTagMutation.mutate(tag.id); }} className="ml-1 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/5 rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add Category</DialogTitle>
            <DialogDescription>Create a new income or expense category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="catName" className="text-white">Name</Label>
              <Input id="catName" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Dining Out" className="bg-zinc-950 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catType" className="text-white">Type</Label>
              <Select value={newCatType} onValueChange={(v) => setNewCatType(v as CategoryType)}>
                <SelectTrigger id="catType" className="bg-zinc-950 border-white/10 text-white focus:ring-[#00d4aa]/50"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="INCOME" className="text-white focus:bg-white/10">Income</SelectItem>
                  <SelectItem value="EXPENSE" className="text-white focus:bg-white/10">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catColor" className="text-white">Color</Label>
              <div className="flex items-center gap-2">
                <Input id="catColor" type="color" value={newCatColor || "#00d4aa"} onChange={(e) => setNewCatColor(e.target.value)} className="h-8 w-12 px-1 bg-zinc-950 border-white/10" />
                <span className="text-xs text-muted-foreground">Optional brand color</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCatDialogOpen(false)} className="border-white/10 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="button" disabled={createCatMutation.isPending || !newCatName.trim()} onClick={() => createCatMutation.mutate({ name: newCatName.trim(), type: newCatType, color: newCatColor || undefined })} className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90">Create Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/5 rounded-xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Add Tag</DialogTitle>
            <DialogDescription>Create a new tag.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName" className="text-white">Name</Label>
              <Input id="tagName" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="e.g. Work" className="bg-zinc-950 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-[#00d4aa]/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagColor" className="text-white">Color</Label>
              <div className="flex items-center gap-2">
                <Input id="tagColor" type="color" value={newTagColor || "#00d4aa"} onChange={(e) => setNewTagColor(e.target.value)} className="h-8 w-12 px-1 bg-zinc-950 border-white/10" />
                <span className="text-xs text-muted-foreground">Optional brand color</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTagDialogOpen(false)} className="border-white/10 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
            <Button type="button" disabled={createTagMutation.isPending || !newTagName.trim()} onClick={() => createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor || undefined })} className="bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90">Create Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
