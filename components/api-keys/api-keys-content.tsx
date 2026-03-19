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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  BookOpen,
  Code,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createApiKey, deleteApiKey, updateApiKey, type ApiScope } from "@/lib/actions/api-keys";
import { formatDistanceToNow } from "date-fns";
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
    <div className="space-y-4">
      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          {/* Summary Cards - Compact */}
          <div className="grid gap-2 sm:gap-3 grid-cols-3">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Keys</p>
                <p className="text-base font-bold mt-0.5">{totalKeys}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Key className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Active</p>
                <p className="text-base font-bold mt-0.5 text-emerald-600">{activeKeys}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Inactive</p>
                <p className="text-base font-bold mt-0.5">{totalKeys - activeKeys}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-slate-100 dark:bg-slate-900/30">
                <XCircle className="h-4 w-4 text-slate-600" />
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
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Documentation
              </CardTitle>
              <CardDescription>
                Learn how to integrate with the ServStack API using your API keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Base URL */}
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <div className="bg-muted p-3 rounded-lg">
                  <code className="text-sm font-mono">{process.env.NEXT_PUBLIC_APP_URL}/api/v1</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-6 w-6 p-0"
                    onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1`)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Authentication */}
              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Include your API key using either method:
                </p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Option 1: x-api-key Header (Recommended)</h4>
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm font-mono">x-api-key: YOUR_API_KEY</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0"
                        onClick={() => copyToClipboard("x-api-key: YOUR_API_KEY")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Option 2: Authorization Bearer</h4>
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm font-mono">Authorization: Bearer YOUR_API_KEY</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-6 w-6 p-0"
                        onClick={() => copyToClipboard("Authorization: Bearer YOUR_API_KEY")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Available Endpoints */}
              <div>
                <h3 className="font-semibold mb-3">Available Endpoints</h3>
                <div className="space-y-4">
                  {/* Menu Endpoints */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Badge variant="outline">menu:read</Badge>
                      Menu Items
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">GET</Badge>
                        <code>/menu</code>
                        <span className="text-muted-foreground">- Get all menu items</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">GET</Badge>
                        <code>/menu/{"{id}"}</code>
                        <span className="text-muted-foreground">- Get specific menu item</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories Endpoints */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Badge variant="outline">categories:read</Badge>
                      Categories
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">GET</Badge>
                        <code>/categories</code>
                        <span className="text-muted-foreground">- Get all categories</span>
                      </div>
                    </div>
                  </div>

                  {/* Branches Endpoints */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Badge variant="outline">branches:read</Badge>
                      Branches
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">GET</Badge>
                        <code>/branches</code>
                        <span className="text-muted-foreground">- Get all branches</span>
                      </div>
                    </div>
                  </div>

                  {/* Inventory Endpoints */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Badge variant="outline">inventory:read</Badge>
                      Inventory
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">GET</Badge>
                        <code>/inventory</code>
                        <span className="text-muted-foreground">- Get inventory items</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">GET</Badge>
                        <code>/inventory/stock-levels</code>
                        <span className="text-muted-foreground">- Get stock levels</span>
                      </div>
                    </div>
                  </div>

                  {/* Sales Endpoints */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Badge variant="outline">sales:read</Badge>
                      Sales (Restricted)
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">GET</Badge>
                        <code>/sales/summary</code>
                        <span className="text-muted-foreground">- Get sales summary</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Examples */}
              <div>
                <h3 className="font-semibold mb-3">Code Examples</h3>
                <div className="space-y-4">
                  {/* JavaScript Example */}
                  <div>
                    <h4 className="font-medium mb-2">JavaScript (fetch)</h4>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>{`// Get menu items
fetch('${process.env.NEXT_PUBLIC_APP_URL}/api/v1/menu', {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));`}</pre>
                    </div>
                  </div>

                  {/* cURL Example */}
                  <div>
                    <h4 className="font-medium mb-2">cURL</h4>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>{`curl -X GET "${process.env.NEXT_PUBLIC_APP_URL}/api/v1/menu" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</pre>
                    </div>
                  </div>

                  {/* Python Example */}
                  <div>
                    <h4 className="font-medium mb-2">Python (requests)</h4>
                    <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                      <pre>{`import requests

headers = {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
}

response = requests.get(
    '${process.env.NEXT_PUBLIC_APP_URL}/api/v1/menu',
    headers=headers
)

data = response.json()
print(data)`}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Format */}
              <div>
                <h3 className="font-semibold mb-3">Response Format</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  All API responses follow this standard format:
                </p>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                  <pre>{`{
  "success": true,
  "data": [...],
  "error": null,
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100
  }
}`}</pre>
                </div>
              </div>

              {/* Rate Limits */}
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Rate Limits</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      API requests are limited to 1000 requests per hour per API key. 
                      Contact support if you need higher limits.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for external integrations. The key will be shown only once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
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
                  This is the only time you&apos;ll see this key. Store it securely.
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
