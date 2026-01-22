"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, X, Plus, Trash2, ChevronDown, Package } from "lucide-react";
import { 
  createMenuItem, 
  updateMenuItem, 
  getInventoryItemsForIngredients,
  getMenuItemWithIngredients,
} from "@/lib/actions/menu";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UnitType } from "@/lib/generated/prisma/client";

interface MenuItem {
  id: string;
  name: string;
  sku: string;
  categoryId?: string | null;
  category: string;
  price: number;
  cost: number;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface MenuFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MenuItem | null;
  categories?: CategoryOption[];
}

interface InventoryItemOption {
  id: string;
  name: string;
  sku: string;
  unit: UnitType;
  unitCost: number;
  category: string;
}

interface IngredientRow {
  inventoryItemId: string;
  inventoryItemName?: string;
  quantity: number;
  unit: UnitType;
  unitCost?: number;
}

const unitOptions: { value: UnitType; label: string }[] = [
  { value: "KG", label: "Kilogram (kg)" },
  { value: "GRAM", label: "Gram (g)" },
  { value: "LITER", label: "Liter (L)" },
  { value: "ML", label: "Milliliter (ml)" },
  { value: "PIECE", label: "Piece" },
  { value: "BOX", label: "Box" },
  { value: "CASE", label: "Case" },
  { value: "PACK", label: "Pack" },
];


export function AddMenuItemForm({ open, onOpenChange, categories = [] }: Omit<MenuFormProps, "item">) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryId: categories.length > 0 ? categories[0].id : "",
    price: "",
    cost: "",
    description: "",
    imageUrl: "",
    isActive: true,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);

  // Load inventory items when ingredients section is opened
  useEffect(() => {
    if (isIngredientsOpen && inventoryItems.length === 0) {
      loadInventoryItems();
    }
  }, [isIngredientsOpen, inventoryItems.length]);

  // Calculate cost when ingredients change
  useEffect(() => {
    if (ingredients.length > 0) {
      const total = ingredients.reduce((sum, ing) => {
        const item = inventoryItems.find((i) => i.id === ing.inventoryItemId);
        return sum + (item ? ing.quantity * item.unitCost : 0);
      }, 0);
      setCalculatedCost(Math.round(total * 100) / 100);
    } else {
      setCalculatedCost(null);
    }
  }, [ingredients, inventoryItems]);

  const loadInventoryItems = async () => {
    const result = await getInventoryItemsForIngredients();
    if (result.success && result.data) {
      setInventoryItems(result.data);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { inventoryItemId: "", quantity: 0, unit: "KG" as UnitType },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientRow, value: string | number) => {
    const updated = [...ingredients];
    if (field === "inventoryItemId") {
      const item = inventoryItems.find((i) => i.id === value);
      updated[index] = {
        ...updated[index],
        inventoryItemId: value as string,
        inventoryItemName: item?.name,
        unit: item?.unit || updated[index].unit,
        unitCost: item?.unitCost,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setIngredients(updated);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Store file and show preview
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrl = formData.imageUrl;

      // Upload image if a file is selected
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);
        uploadFormData.append("folder", "products");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Failed to upload image");
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      const validIngredients = ingredients.filter(
        (ing) => ing.inventoryItemId && ing.quantity > 0
      );

      const result = await createMenuItem({
        name: formData.name,
        sku: formData.sku,
        categoryId: formData.categoryId,
        price: parseFloat(formData.price),
        cost: calculatedCost ?? (formData.cost ? parseFloat(formData.cost) : undefined),
        description: formData.description || undefined,
        imageUrl: imageUrl || undefined,
        isActive: formData.isActive,
        ingredients: validIngredients.length > 0 ? validIngredients : undefined,
      });

      if (result.success) {
        toast.success("Menu item created successfully");
        onOpenChange(false);
        setFormData({
          name: "",
          sku: "",
          categoryId: categories.length > 0 ? categories[0].id : "",
          price: "",
          cost: "",
          description: "",
          imageUrl: "",
          isActive: true,
        });
        setImagePreview(null);
        setSelectedFile(null);
        setIngredients([]);
        setCalculatedCost(null);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create menu item");
      }
    } catch (error) {
      console.error("Error creating menu item:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create menu item");
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
                          setSelectedFile(null);
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
                {categories.length > 0 ? (
                  <select
                    id="category"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                    No categories available. Please create categories first in the Categories page.
                  </p>
                )}
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

            {/* Ingredients Section */}
            <Collapsible open={isIngredientsOpen} onOpenChange={setIsIngredientsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" type="button" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Recipe Ingredients
                    {ingredients.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {ingredients.length}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isIngredientsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Link inventory items to auto-calculate cost
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={addIngredient}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>

                  {ingredients.length > 0 && (
                    <ScrollArea className="max-h-48">
                      <div className="space-y-2">
                        {ingredients.map((ing, index) => (
                          <div key={index} className="flex items-center gap-2 rounded border p-2">
                            <Select
                              value={ing.inventoryItemId}
                              onValueChange={(value) => updateIngredient(index, "inventoryItemId", value)}
                            >
                              <SelectTrigger className="flex-1 h-8 text-xs">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name} ({item.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="Qty"
                              value={ing.quantity || ""}
                              onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 text-xs"
                            />
                            <Select
                              value={ing.unit}
                              onValueChange={(value) => updateIngredient(index, "unit", value)}
                            >
                              <SelectTrigger className="w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptions.map((unit) => (
                                  <SelectItem key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => removeIngredient(index)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {calculatedCost !== null && (
                    <div className="flex items-center justify-between rounded bg-muted/50 p-2">
                      <span className="text-sm font-medium">Calculated Cost:</span>
                      <span className="text-sm font-bold text-primary">
                        GH₵ {calculatedCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
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

export function EditMenuItemForm({ open, onOpenChange, item, categories = [] }: MenuFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: item?.name || "",
    sku: item?.sku || "",
    categoryId: item?.categoryId || (categories.length > 0 ? categories[0].id : ""),
    price: item?.price.toString() || "",
    cost: item?.cost.toString() || "",
    description: item?.description || "",
    imageUrl: item?.imageUrl || "",
    isActive: item?.isActive ?? true,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(item?.imageUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        sku: item.sku,
        categoryId: item?.categoryId || (categories.length > 0 ? categories[0].id : ""),
        price: item.price.toString(),
        cost: item.cost.toString(),
        description: item.description || "",
        imageUrl: item.imageUrl || "",
        isActive: item.isActive,
      });
      setImagePreview(item.imageUrl || null);
    }
  }, [item, categories]);

  // Load inventory items and existing ingredients when section opens
  useEffect(() => {
    if (isIngredientsOpen && item) {
      loadData();
    }
  }, [isIngredientsOpen, item]);

  // Calculate cost when ingredients change
  useEffect(() => {
    if (ingredients.length > 0) {
      const total = ingredients.reduce((sum, ing) => {
        const itemData = inventoryItems.find((i) => i.id === ing.inventoryItemId);
        const unitCost = itemData?.unitCost || ing.unitCost || 0;
        return sum + ing.quantity * unitCost;
      }, 0);
      setCalculatedCost(Math.round(total * 100) / 100);
    } else {
      setCalculatedCost(null);
    }
  }, [ingredients, inventoryItems]);

  const loadData = async () => {
    if (!item) return;
    setIsLoadingIngredients(true);
    try {
      const [invResult, ingResult] = await Promise.all([
        getInventoryItemsForIngredients(),
        getMenuItemWithIngredients(item.id),
      ]);
      
      if (invResult.success && invResult.data) {
        setInventoryItems(invResult.data);
      }
      
      if (ingResult.success && ingResult.data?.ingredients) {
        setIngredients(
          ingResult.data.ingredients.map((ing) => ({
            inventoryItemId: ing.inventoryItemId,
            inventoryItemName: ing.inventoryItemName,
            quantity: ing.quantity,
            unit: ing.unit,
            unitCost: ing.unitCost,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { inventoryItemId: "", quantity: 0, unit: "KG" as UnitType },
    ]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientRow, value: string | number) => {
    const updated = [...ingredients];
    if (field === "inventoryItemId") {
      const itemData = inventoryItems.find((i) => i.id === value);
      updated[index] = {
        ...updated[index],
        inventoryItemId: value as string,
        inventoryItemName: itemData?.name,
        unit: itemData?.unit || updated[index].unit,
        unitCost: itemData?.unitCost,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setIngredients(updated);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Store file and show preview
    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setIsSubmitting(true);

    try {
      let imageUrl = formData.imageUrl;

      // Upload image if a new file is selected
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);
        uploadFormData.append("folder", "products");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Failed to upload image");
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      const validIngredients = ingredients.filter(
        (ing) => ing.inventoryItemId && ing.quantity > 0
      );

      const result = await updateMenuItem({
        id: item.id,
        name: formData.name,
        sku: formData.sku,
        categoryId: formData.categoryId,
        price: parseFloat(formData.price),
        cost: calculatedCost ?? (formData.cost ? parseFloat(formData.cost) : undefined),
        description: formData.description || undefined,
        imageUrl: imageUrl || undefined,
        isActive: formData.isActive,
        ingredients: validIngredients,
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
      toast.error(error instanceof Error ? error.message : "Failed to update menu item");
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
          <div className="grid gap-6 mb-2">
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
                          setSelectedFile(null);
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
                {categories.length > 0 ? (
                  <select
                    id="edit-category"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                    No categories available. Please create categories first.
                  </p>
                )}
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

            {/* Ingredients Section */}
            <Collapsible open={isIngredientsOpen} onOpenChange={setIsIngredientsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" type="button" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Recipe Ingredients
                    {ingredients.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {ingredients.length}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isIngredientsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Link inventory items to auto-calculate cost
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={addIngredient}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>

                  {isLoadingIngredients ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : ingredients.length > 0 ? (
                    <ScrollArea className="max-h-48">
                      <div className="space-y-2">
                        {ingredients.map((ing, index) => (
                          <div key={index} className="flex items-center gap-2 rounded border p-2">
                            <Select
                              value={ing.inventoryItemId}
                              onValueChange={(value) => updateIngredient(index, "inventoryItemId", value)}
                            >
                              <SelectTrigger className="flex-1 h-8 text-xs">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryItems.map((invItem) => (
                                  <SelectItem key={invItem.id} value={invItem.id}>
                                    {invItem.name} ({invItem.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="Qty"
                              value={ing.quantity || ""}
                              onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 text-xs"
                            />
                            <Select
                              value={ing.unit}
                              onValueChange={(value) => updateIngredient(index, "unit", value)}
                            >
                              <SelectTrigger className="w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {unitOptions.map((unit) => (
                                  <SelectItem key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => removeIngredient(index)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      No ingredients linked. Add ingredients to auto-calculate recipe cost.
                    </p>
                  )}

                  {calculatedCost !== null && (
                    <div className="flex items-center justify-between rounded bg-muted/50 p-2">
                      <span className="text-sm font-medium">Calculated Cost:</span>
                      <span className="text-sm font-bold text-primary">
                        GH₵ {calculatedCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
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
