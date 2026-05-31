"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Tag } from "lucide-react";
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
import { CategoryType } from "@prisma/client";

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color?: string | null;
  icon?: string | null;
}

interface Tag {
  id: string;
  name: string;
  color?: string | null;
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

async function createCategory(data: {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
}) {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

async function createTag(data: { name: string; color?: string }) {
  const res = await fetch("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
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

export function CategoryManager() {
  const queryClient = useQueryClient();

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<CategoryType>("EXPENSE");
  const [newCatColor, setNewCatColor] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("");

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  const createCatMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCatName("");
      setNewCatColor("");
      setCatDialogOpen(false);
    },
  });

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewTagName("");
      setNewTagColor("");
      setTagDialogOpen(false);
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const cats = categories ?? [];
  const allTags = tags ?? [];

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Categories</h2>
          <Button size="sm" onClick={() => setCatDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {catsLoading ? (
          <div className="text-muted-foreground">Loading categories...</div>
        ) : cats.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No categories yet.
          </div>
        ) : (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cats.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          cat.type === "INCOME"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {cat.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cat.color ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full border border-foreground/10"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {cat.color}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tags</h2>
          <Button size="sm" onClick={() => setTagDialogOpen(true)}>
            <Tag className="mr-1 h-4 w-4" />
            Add Tag
          </Button>
        </div>

        {tagsLoading ? (
          <div className="text-muted-foreground">Loading tags...</div>
        ) : allTags.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No tags yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-sm"
              >
                {tag.color && (
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                <span>{tag.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm("Are you sure you want to delete this tag?")
                    ) {
                      deleteTagMutation.mutate(tag.id);
                    }
                  }}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Create a new income or expense category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="catName">Name</Label>
              <Input
                id="catName"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Dining Out"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catType">Type</Label>
              <Select
                value={newCatType}
                onValueChange={(v) => setNewCatType(v as CategoryType)}
              >
                <SelectTrigger id="catType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catColor">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="catColor"
                  type="color"
                  value={newCatColor || "#00d4aa"}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="h-8 w-12 px-1"
                />
                <span className="text-xs text-muted-foreground">
                  Optional brand color
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCatDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createCatMutation.isPending || !newCatName.trim()}
              onClick={() =>
                createCatMutation.mutate({
                  name: newCatName.trim(),
                  type: newCatType,
                  color: newCatColor || undefined,
                })
              }
            >
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
            <DialogDescription>Create a new tag.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Name</Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g. Work"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagColor">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tagColor"
                  type="color"
                  value={newTagColor || "#00d4aa"}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-8 w-12 px-1"
                />
                <span className="text-xs text-muted-foreground">
                  Optional brand color
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTagDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createTagMutation.isPending || !newTagName.trim()}
              onClick={() =>
                createTagMutation.mutate({
                  name: newTagName.trim(),
                  color: newTagColor || undefined,
                })
              }
            >
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
