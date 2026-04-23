import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, Plus, Merge } from "lucide-react";
import { CATEGORY_COLORS } from "@spendlens/shared";
import { CategoryIcon, availableIcons } from "../components/ui/CategoryIcon.tsx";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@spendlens/shared";
import * as categoriesApi from "../api/categories.ts";
import { Button } from "../components/ui/Button.tsx";
import { Card } from "../components/ui/Card.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input } from "../components/ui/Input.tsx";
import { Select } from "../components/ui/Select.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { useToast } from "../components/ui/Toast.tsx";

export function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getCategories();
      setCategories(data);
    } catch {
      toast("error", "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading categories...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your spending categories ({categories.length} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowMergeModal(true)}>
            <Merge className="mr-1.5 h-4 w-4" />
            Merge
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
              >
                <CategoryIcon name={cat.icon} className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{cat.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {cat.isDefault && (
                    <Badge color="#6366f1">Default</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingCategory(cat)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeletingCategory(cat)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <CreateCategoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          fetchCategories();
        }}
      />

      {editingCategory && (
        <EditCategoryModal
          isOpen={true}
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onUpdated={() => {
            setEditingCategory(null);
            fetchCategories();
          }}
        />
      )}

      {deletingCategory && (
        <DeleteCategoryModal
          isOpen={true}
          category={deletingCategory}
          categories={categories}
          onClose={() => setDeletingCategory(null)}
          onDeleted={() => {
            setDeletingCategory(null);
            fetchCategories();
          }}
        />
      )}

      <MergeCategoryModal
        isOpen={showMergeModal}
        categories={categories}
        onClose={() => setShowMergeModal(false)}
        onMerged={() => {
          setShowMergeModal(false);
          fetchCategories();
        }}
      />
    </div>
  );
}

function CreateCategoryModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#94a3b8");
  const [icon, setIcon] = useState("Tag");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const input: CreateCategoryInput = { name: name.trim(), color, icon };
      await categoriesApi.createCategory(input);
      toast("success", `Category "${name}" created`);
      setName("");
      setColor("#94a3b8");
      onCreated();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message: string } } }).response?.data
              ?.message
          : "Failed to create category";
      toast("error", msg || "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Category">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Coffee"
          autoFocus
          required
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-transform ${
                  color === c
                    ? "ring-2 ring-offset-2 ring-brand-500 scale-110"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Icon
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {availableIcons.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  icon === iconName
                    ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
                title={iconName}
              >
                <CategoryIcon name={iconName} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditCategoryModal({
  isOpen,
  category,
  onClose,
  onUpdated,
}: {
  isOpen: boolean;
  category: Category;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const [icon, setIcon] = useState(category.icon);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const input: UpdateCategoryInput = {};
      if (name.trim() !== category.name) input.name = name.trim();
      if (color !== category.color) input.color = color;
      if (icon !== category.icon) input.icon = icon;

      if (Object.keys(input).length === 0) {
        onClose();
        return;
      }

      await categoriesApi.updateCategory(category.id, input);
      toast("success", `Category "${name}" updated`);
      onUpdated();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message: string } } }).response?.data
              ?.message
          : "Failed to update category";
      toast("error", msg || "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Category">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-transform ${
                  color === c
                    ? "ring-2 ring-offset-2 ring-brand-500 scale-110"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Icon
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {availableIcons.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setIcon(iconName)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  icon === iconName
                    ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
                title={iconName}
              >
                <CategoryIcon name={iconName} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteCategoryModal({
  isOpen,
  category,
  categories,
  onClose,
  onDeleted,
}: {
  isOpen: boolean;
  category: Category;
  categories: Category[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [reassignTo, setReassignTo] = useState("");
  const [saving, setSaving] = useState(false);

  const otherCategories = categories.filter((c) => c.id !== category.id);

  async function handleDelete() {
    setSaving(true);
    try {
      await categoriesApi.deleteCategory(
        category.id,
        reassignTo || undefined,
      );
      toast("success", `Category "${category.name}" deleted`);
      onDeleted();
    } catch {
      toast("error", "Failed to delete category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Category">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{category.name}</span>? Transactions
          using this category will need to be reassigned.
        </p>
        <Select
          label="Reassign transactions to"
          value={reassignTo}
          onChange={(e) => setReassignTo(e.target.value)}
          options={[
            { value: "", label: "No reassignment (unset category)" },
            ...otherCategories.map((c) => ({
              value: c.id,
              label: c.name,
            })),
          ]}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={saving}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MergeCategoryModal({
  isOpen,
  categories,
  onClose,
  onMerged,
}: {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onMerged: () => void;
}) {
  const { toast } = useToast();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [saving, setSaving] = useState(false);

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  async function handleMerge() {
    if (!sourceId || !targetId) return;
    if (sourceId === targetId) {
      toast("error", "Source and target must be different");
      return;
    }

    setSaving(true);
    try {
      await categoriesApi.mergeCategories({
        sourceCategoryId: sourceId,
        targetCategoryId: targetId,
      });
      toast("success", "Categories merged successfully");
      setSourceId("");
      setTargetId("");
      onMerged();
    } catch {
      toast("error", "Failed to merge categories");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Merge Categories">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Move all transactions from the source category into the target
          category. The source category will be deleted.
        </p>
        <Select
          label="Source (will be deleted)"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          options={[
            { value: "", label: "Select a category..." },
            ...categoryOptions,
          ]}
        />
        <Select
          label="Target (will keep)"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          options={[
            { value: "", label: "Select a category..." },
            ...categoryOptions,
          ]}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            isLoading={saving}
            disabled={!sourceId || !targetId || sourceId === targetId}
          >
            Merge
          </Button>
        </div>
      </div>
    </Modal>
  );
}
