"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Key,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createApiKey, deleteApiKey, updateApiKey, type ApiScope } from "@/lib/actions/api-keys";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ApiKey {
  id: string;
  key: string;
  name: string;
  scopes: string[];
  branchId: string | null;
  branch: { id: string; name: string; code: string } | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface ApiKeysContentProps {
  apiKeys: ApiKey[];
  branches: Branch[];
}

const availableScopes: { value: ApiScope; label: string; description: string }[] = [
  { value: "menu:read", label: "Menu Read", description: "Read menu items and categories" },
  { value: "menu:write", label: "Menu Write", description: "Create and update menu items" },
  { value: "branches:read", label: "Branches Read", description: "Read branch information" },
  { value: "categories:read", label: "Categories Read", description: "Read menu categories" },
  { value: "inventory:read", label: "Inventory Read", description: "Read inventory data" },
  { value: "sales:read", label: "Sales Read", description: "Read sales data (restricted)" },
];

export function ApiKeysContent({ apiKeys, branches }: ApiKeysContentProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: "",
    branchId: "all",
    scopes: [] as ApiScope[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!formData.name || formData.scopes.length === 0) {
      toast.error("Please provide a name and select at least one scope");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createApiKey({
        name: formData.name,
        branchId: formData.branchId === "all" ? undefined : formData.branchId,
        scopes: formData.scopes,
      });

      if (result.success && result.data) {
        toast.success("API key created successfully");
        setIsCreateOpen(false);
        setFormData({ name: "", branchId: "all", scopes: [] });
        setViewingKey(result.data.key);
        setIsViewOpen(true);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create API key");
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete API key "${name}"? This action cannot be undone.`)) {
      return;
    }

    const result = await deleteApiKey(id);
    if (result.success) {
      toast.success("API key deleted successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete API key");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const result = await updateApiKey({
      id,
      isActive: !currentStatus,
    });

    if (result.success) {
      toast.success(`API key ${!currentStatus ? "activated" : "deactivated"}`);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API key copied to clipboard");
  };

  const toggleScope = (scope: ApiScope) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const activeKeys = apiKeys.filter((k) => k.isActive).length;
  const totalKeys = apiKeys.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total API Keys</p>
                <p className="text-xl font-bold">{totalKeys}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Key className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Keys</p>
                <p className="text-xl font-bold text-emerald-600">{activeKeys}</p>
              </div>
              <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive Keys</p>
                <p className="text-xl font-bold">{totalKeys - activeKeys}</p>
              </div>
              <div className="rounded-xl bg-slate-100 dark:bg-slate-900/30 p-3">
                <XCircle className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* API Keys Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage API keys for external integrations. Keys are shown only once when created.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Key className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-1">No API Keys</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create your first API key to enable external integrations
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {showKey[key.id] ? key.key : `${key.key.substring(0, 12)}...`}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setShowKey((prev) => ({ ...prev, [key.id]: !prev[key.id] }));
                          }}
                        >
                          {showKey[key.id] ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(key.key)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.branch ? (
                        <Badge variant="secondary">{key.branch.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">All Branches</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {key.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(key.id, key.isActive)}
                        >
                          {key.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(key.id, key.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for external integrations. The key will be shown only once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Key Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Mobile App Integration"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Branch (Optional)</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger id="branch">
                  <SelectValue placeholder="All branches (no restriction)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Restrict this key to a specific branch, or leave empty for all branches
              </p>
            </div>

            <div className="space-y-3">
              <Label>
                Permissions (Scopes) <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2 rounded-lg border p-4">
                {availableScopes.map((scope) => (
                  <div key={scope.value} className="flex items-start space-x-3">
                    <Checkbox
                      id={scope.value}
                      checked={formData.scopes.includes(scope.value)}
                      onCheckedChange={() => toggleScope(scope.value)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={scope.value}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {scope.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{scope.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {formData.scopes.length === 0 && (
                <p className="text-xs text-destructive">Please select at least one scope</p>
              )}
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Important:</p>
                  <p>
                    The API key will be displayed only once after creation. Make sure to copy and
                    store it securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || formData.scopes.length === 0}>
              {isSubmitting ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Created Key Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <code className="text-sm font-mono break-all">{viewingKey}</code>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <p className="text-xs text-red-800 dark:text-red-200">
                  This is the only time you'll see this key. Store it securely.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (viewingKey) copyToClipboard(viewingKey);
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Key
            </Button>
            <Button onClick={() => setIsViewOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
