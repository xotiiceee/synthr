"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  User,
  Mail,
  Lock,
  Palette,
  DollarSign,
  Moon,
  Sun,
  Monitor,
  AlertTriangle,
  Download,
  Trash2,
  Plus,
  Pencil,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryType } from "@prisma/client";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
}

const glassCard = "relative overflow-hidden border-0 bg-slate-800/50 backdrop-blur-xl ring-1 ring-white/10";
const dangerCard = "relative overflow-hidden border-0 bg-slate-800/50 backdrop-blur-xl ring-1 ring-rose-500/30";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

async function createCategory(data: {
  name: string;
  type: CategoryType;
  color?: string;
}) {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

async function updateCategory(
  id: string,
  data: { name: string; type: CategoryType; color?: string }
) {
  const res = await fetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update category");
  return res.json();
}

async function deleteCategory(id: string) {
  const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete category");
  return res.json();
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Profile state
  const [name, setName] = useState("");
  const [email] = useState("user@example.com");
  const [profileSaving, setProfileSaving] = useState(false);

  // Category state
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({
    name: "",
    type: "EXPENSE" as CategoryType,
    color: "#00d4aa",
  });

  // Preferences state
  const [currency, setCurrency] = useState("USD");
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

  // Danger zone
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme]);

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const createCatMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeCatDialog();
      toast.success("Category created");
    },
    onError: () => toast.error("Failed to create category"),
  });

  const updateCatMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; type: CategoryType; color?: string };
    }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeCatDialog();
      toast.success("Category updated");
    },
    onError: () => toast.error("Failed to update category"),
  });

  const deleteCatMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: () => toast.error("Failed to delete category"),
  });

  function openAddCategory() {
    setEditingCategory(null);
    setCatForm({ name: "", type: "EXPENSE", color: "#00d4aa" });
    setCatDialogOpen(true);
  }

  function openEditCategory(cat: Category) {
    setEditingCategory(cat);
    setCatForm({
      name: cat.name,
      type: cat.type,
      color: cat.color || "#00d4aa",
    });
    setCatDialogOpen(true);
  }

  function closeCatDialog() {
    setCatDialogOpen(false);
    setEditingCategory(null);
    setCatForm({ name: "", type: "EXPENSE", color: "#00d4aa" });
  }

  function handleCatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!catForm.name.trim()) return;
    if (editingCategory) {
      updateCatMutation.mutate({
        id: editingCategory.id,
        data: {
          name: catForm.name.trim(),
          type: catForm.type,
          color: catForm.color,
        },
      });
    } else {
      createCatMutation.mutate({
        name: catForm.name.trim(),
        type: catForm.type,
        color: catForm.color,
      });
    }
  }

  async function handleSaveProfile() {
    setProfileSaving(true);
    setTimeout(() => {
      setProfileSaving(false);
      toast.success("Profile updated (demo)");
    }, 500);
  }

  function handleExportAll() {
    toast.info("Export all data — coming soon");
  }

  function handleDeleteAll() {
    setDeleteConfirmOpen(false);
    toast.error("Delete all data — API not implemented");
  }

  const cats = categories ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-white/10">
          <Settings className="h-5 w-5 text-[#00d4aa]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Settings
          </h1>
          <p className="text-sm text-slate-400">
            Manage your profile, categories, and preferences.
          </p>
        </div>
      </div>

      {/* Profile */}
      <Card className={cn(glassCard)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-200">
            <User className="h-5 w-5 text-[#00d4aa]" />
            Profile
          </CardTitle>
          <CardDescription className="text-slate-400">
            Update your personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Display Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="bg-slate-800 ring-1 ring-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  value={email}
                  readOnly
                  className="bg-slate-900/50 text-slate-400 ring-1 ring-white/10"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="bg-[#00d4aa] text-slate-900 hover:bg-[#00d4aa]/90"
            >
              <Save className="mr-2 h-4 w-4" />
              {profileSaving ? "Saving..." : "Save Profile"}
            </Button>
            <Button
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              <Lock className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card className={cn(glassCard)}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-200">
              <Palette className="h-5 w-5 text-[#00d4aa]" />
              Categories
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage your income and expense categories.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={openAddCategory}
            className="bg-[#00d4aa] text-slate-900 hover:bg-[#00d4aa]/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {catsLoading ? (
            <div className="text-slate-400">Loading categories...</div>
          ) : cats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600 p-6 text-center text-sm text-slate-400">
              No categories yet. Add one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl ring-1 ring-white/5">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Color</TableHead>
                    <TableHead className="text-right text-slate-400">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cats.map((cat) => (
                    <TableRow key={cat.id} className="border-white/5">
                      <TableCell className="font-medium text-slate-200">
                        {cat.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            cat.type === "INCOME"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          )}
                        >
                          {cat.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {cat.color ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full ring-1 ring-white/10"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-xs text-slate-400">
                              {cat.color}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditCategory(cat)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this category?"
                                )
                              ) {
                                deleteCatMutation.mutate(cat.id);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className={cn(glassCard)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-200">
            <DollarSign className="h-5 w-5 text-[#00d4aa]" />
            Preferences
          </CardTitle>
          <CardDescription className="text-slate-400">
            Customize your app experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-slate-300">Currency</Label>
            <Select
              value={currency}
              onValueChange={(v: string | null) => setCurrency(v ?? "USD")}
            >
              <SelectTrigger className="w-40 bg-slate-800 ring-1 ring-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-0 bg-slate-800 ring-1 ring-white/10">
                <SelectItem value="USD" className="focus:bg-slate-700">
                  USD ($)
                </SelectItem>
                <SelectItem value="EUR" className="focus:bg-slate-700">
                  EUR (€)
                </SelectItem>
                <SelectItem value="GBP" className="focus:bg-slate-700">
                  GBP (£)
                </SelectItem>
                <SelectItem value="JPY" className="focus:bg-slate-700">
                  JPY (¥)
                </SelectItem>
                <SelectItem value="CAD" className="focus:bg-slate-700">
                  CAD (C$)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Theme</Label>
            <div className="inline-flex gap-1 rounded-lg bg-slate-900/50 p-1 ring-1 ring-white/5">
              <Button
                variant={theme === "dark" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("dark")}
                className={cn(
                  theme === "dark" && "bg-slate-700 text-slate-100"
                )}
              >
                <Moon className="mr-1 h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === "light" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("light")}
                className={cn(
                  theme === "light" && "bg-slate-700 text-slate-100"
                )}
              >
                <Sun className="mr-1 h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === "system" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("system")}
                className={cn(
                  theme === "system" && "bg-slate-700 text-slate-100"
                )}
              >
                <Monitor className="mr-1 h-4 w-4" />
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className={cn(dangerCard)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-slate-400">
            Destructive actions that cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg bg-rose-500/5 p-4 ring-1 ring-rose-500/10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium text-slate-200">Delete All Data</h4>
              <p className="text-sm text-slate-400">
                Permanently remove all your transactions, accounts, and settings.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All Data
            </Button>
          </div>
          <div className="flex flex-col gap-4 rounded-lg bg-slate-900/40 p-4 ring-1 ring-white/5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-medium text-slate-200">Export All Data</h4>
              <p className="text-sm text-slate-400">
                Download a complete backup of your data.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportAll}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              <Download className="mr-2 h-4 w-4" />
              Export All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="border-0 bg-slate-900 ring-1 ring-white/10">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingCategory
                ? "Update this category."
                : "Create a new income or expense category."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCatSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catName" className="text-slate-300">
                Name
              </Label>
              <Input
                id="catName"
                value={catForm.name}
                onChange={(e) =>
                  setCatForm({ ...catForm, name: e.target.value })
                }
                placeholder="e.g. Dining Out"
                required
                className="bg-slate-800 ring-1 ring-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catType" className="text-slate-300">
                Type
              </Label>
              <Select
                value={catForm.type}
                onValueChange={(v: string | null) =>
                  setCatForm({
                    ...catForm,
                    type: (v as CategoryType) ?? "EXPENSE",
                  })
                }
              >
                <SelectTrigger className="bg-slate-800 ring-1 ring-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-0 bg-slate-800 ring-1 ring-white/10">
                  <SelectItem value="INCOME" className="focus:bg-slate-700">
                    Income
                  </SelectItem>
                  <SelectItem value="EXPENSE" className="focus:bg-slate-700">
                    Expense
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catColor" className="text-slate-300">
                Color
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="catColor"
                  type="color"
                  value={catForm.color}
                  onChange={(e) =>
                    setCatForm({ ...catForm, color: e.target.value })
                  }
                  className="h-8 w-12 bg-slate-800 px-1 ring-1 ring-white/10"
                />
                <span className="text-xs text-slate-400">
                  {catForm.color}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeCatDialog}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createCatMutation.isPending ||
                  updateCatMutation.isPending ||
                  !catForm.name.trim()
                }
                className="bg-[#00d4aa] text-slate-900 hover:bg-[#00d4aa]/90"
              >
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="border-0 bg-slate-900 ring-1 ring-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              Delete All Data?
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This action cannot be undone. All your data will be permanently
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              Yes, Delete Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
