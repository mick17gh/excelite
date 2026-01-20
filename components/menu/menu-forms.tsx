"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, X } from "lucide-react";
import { createMenuItem, updateMenuItem } from "@/lib/actions/menu";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface MenuItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
}

interface MenuFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MenuItem | null;
}

const categories = [
  "Appetizers",
  "Main Course",
  "Desserts",
  "Beverages",
  "Salads",
  "Soups",
  "Sides",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Specials",
  "Kids Menu",
];

export function AddMenuItemForm({ open, onOpenChange }: Omit<MenuFormProps, "item">) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "Main Course",
    price: "",
    cost: "",
    description: "",
    imageUrl: "",
    isActive: true,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Upload to DigitalOcean Spaces
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createMenuItem({
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success("Menu item created successfully");
        onOpenChange(false);
        setFormData({
          name: "",
          sku: "",
          category: "Main Course",
          price: "",
          cost: "",
          description: "",
          imageUrl: "",
          isActive: true,
        });
        setImagePreview(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create menu item");
      }
    } catch (error) {
      console.error("Error creating menu item:", error);
      toast.error("Failed to create menu item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Menu Item</DialogTitle>
          <DialogDescription>
            Create a new menu item for your restaurant. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Image Upload Section */}
            <div className="space-y-3">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-32 w-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30 overflow-hidden">
                  {imagePreview ? (
                    <>
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, imageUrl: "" });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </Label>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: 800x800px, JPG or PNG
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Grilled Salmon"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sku"
                  placeholder="e.g., SALM-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive-switch">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Item will be visible in POS and menus
                    </p>
                  </div>
                  <Switch
                    id="isActive-switch"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  Selling Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">
                  Cost Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  required
                />
              </div>
            </div>

            {formData.price && formData.cost && (
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profit Margin</span>
                  <span className="font-semibold text-emerald-600">
                    {((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the menu item..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Menu Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditMenuItemForm({ open, onOpenChange, item }: MenuFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: item?.name || "",
    sku: item?.sku || "",
    category: item?.category || "Main Course",
    price: item?.price.toString() || "",
    cost: item?.cost.toString() || "",
    description: item?.description || "",
    imageUrl: item?.imageUrl || "",
    isActive: item?.isActive ?? true,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageUrl || null);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        sku: item.sku,
        category: item.category,
        price: item.price.toString(),
        cost: item.cost.toString(),
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        isActive: item.isActive,
      });
      setImagePreview(item.imageUrl || null);
    }
  }, [item]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Upload to DigitalOcean Spaces
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setIsSubmitting(true);

    try {
      const result = await updateMenuItem({
        id: item.id,
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        description: formData.description || undefined,
        imageUrl: formData.imageUrl || undefined,
        isActive: formData.isActive,
      });

      if (result.success) {
        toast.success("Menu item updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update menu item");
      }
    } catch (error) {
      console.error("Error updating menu item:", error);
      toast.error("Failed to update menu item");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Menu Item</DialogTitle>
          <DialogDescription>
            Update the details for {item.name}. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Image Upload Section */}
            <div className="space-y-3">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-32 w-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30 overflow-hidden">
                  {imagePreview ? (
                    <>
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, imageUrl: "" });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload-edit"
                  />
                  <Label
                    htmlFor="image-upload-edit"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {imagePreview ? "Change Image" : "Upload Image"}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: 800x800px, JPG or PNG
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sku">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <select
                  id="edit-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-isActive">Status</Label>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-isActive-switch">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Item will be visible in POS and menus
                    </p>
                  </div>
                  <Switch
                    id="edit-isActive-switch"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">
                  Selling Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost">
                  Cost Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  required
                />
              </div>
            </div>

            {formData.price && formData.cost && (
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Profit Margin</span>
                  <span className="font-semibold text-emerald-600">
                    {((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Menu Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
