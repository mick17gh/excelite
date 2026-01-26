"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Package,
  Users,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { acknowledgeAlert, resolveAlert, dismissAlert, triggerAlertGeneration } from "@/lib/actions/alerts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { TablePagination } from "@/components/ui/table-pagination";

interface Alert {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  branchName?: string;
  triggeredAt: Date;
  status?: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface AlertsContentProps {
  alerts: Alert[];
  branches: Branch[];
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case "SALES_DROP":
      return TrendingDown;
    case "LOW_STOCK":
    case "OVERSTOCK":
      return Package;
    case "STAFF_SHORTAGE":
      return Users;
    case "EXCEPTIONAL_GROWTH":
    case "TARGET_ACHIEVED":
      return TrendingUp;
    case "WASTE_SPIKE":
      return AlertTriangle;
    default:
      return Bell;
  }
};

export function AlertsContent({ alerts: initialAlerts, branches }: AlertsContentProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Alert rules state
  const [alertRules, setAlertRules] = useState({
    salesDrop: true,
    lowStock: true,
    wasteSpike: true,
    staffShortage: true,
    targetAchieved: true,
  });

  const handleGenerateAlerts = () => {
    setIsGenerating(true);
    startTransition(async () => {
      try {
        const result = await triggerAlertGeneration();
        if (result.success) {
          toast.success(`Alert check complete. ${result.data?.alertsCreated || 0} alerts created.`);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to generate alerts");
        }
      } catch {
        toast.error("Failed to generate alerts");
      } finally {
        setIsGenerating(false);
      }
    });
  };

  const handleSaveConfig = () => {
    toast.success("Alert configuration saved");
    setIsConfigOpen(false);
  };

  const handleAcknowledge = (alertId: string) => {
    setActionLoadingId(alertId);
    startTransition(async () => {
      try {
        const result = await acknowledgeAlert(alertId);
        if (result.success) {
          toast.success("Alert acknowledged");
          setAlerts(alerts.map((a) => 
            a.id === alertId ? { ...a, status: "acknowledged" } : a
          ));
        } else {
          toast.error(result.error || "Failed to acknowledge alert");
        }
      } catch {
        toast.error("Failed to acknowledge alert");
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  const handleResolve = (alertId: string) => {
    setActionLoadingId(alertId);
    startTransition(async () => {
      try {
        const result = await resolveAlert(alertId, "system");
        if (result.success) {
          toast.success("Alert resolved");
          setAlerts(alerts.map((a) => 
            a.id === alertId ? { ...a, status: "resolved" } : a
          ));
        } else {
          toast.error(result.error || "Failed to resolve alert");
        }
      } catch {
        toast.error("Failed to resolve alert");
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  const handleDismiss = (alertId: string) => {
    setActionLoadingId(alertId);
    startTransition(async () => {
      try {
        const result = await dismissAlert(alertId);
        if (result.success) {
          toast.success("Alert dismissed");
          setAlerts(alerts.map((a) => 
            a.id === alertId ? { ...a, status: "dismissed" } : a
          ));
        } else {
          toast.error(result.error || "Failed to dismiss alert");
        }
      } catch {
        toast.error("Failed to dismiss alert");
      } finally {
        setActionLoadingId(null);
      }
    });
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity =
        severityFilter === "all" || alert.severity === severityFilter;
      const matchesType = typeFilter === "all" || alert.type === typeFilter;
      const matchesBranch =
        branchFilter === "all" || alert.branchName === branches.find((b) => b.id === branchFilter)?.name;
      return matchesSearch && matchesSeverity && matchesType && matchesBranch;
    });
  }, [alerts, searchQuery, severityFilter, typeFilter, branchFilter, branches]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, severityFilter, typeFilter, branchFilter]);

  // Paginated alerts
  const totalPages = Math.ceil(filteredAlerts.length / pageSize);
  const paginatedAlerts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAlerts.slice(startIndex, startIndex + pageSize);
  }, [filteredAlerts, currentPage, pageSize]);

  const activeAlerts = alerts.filter((a) => a.status !== "resolved" && a.status !== "dismissed");
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const highAlerts = alerts.filter((a) => a.severity === "high");
  const resolvedToday = alerts.filter((a) => a.status === "resolved");

  const alertTypes = [...new Set(alerts.map((a) => a.type))];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "high":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-500 text-white">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500 text-white">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "acknowledged":
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Eye className="mr-1 h-3 w-3" />
            Acknowledged
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Resolved
          </Badge>
        );
      case "dismissed":
        return (
          <Badge variant="secondary">
            <X className="mr-1 h-3 w-3" />
            Dismissed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Active
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards - Compact */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Active</p>
                <p className="text-base font-bold mt-0.5">{activeAlerts.length}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Bell className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl border-red-200/50 dark:border-red-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Critical</p>
                <p className="text-base font-bold mt-0.5 text-red-600">{criticalAlerts.length}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl border-orange-200/50 dark:border-orange-800/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">High</p>
                <p className="text-base font-bold mt-0.5 text-orange-600">{highAlerts.length}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-orange-100 dark:bg-orange-900/30">
                <Bell className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Resolved</p>
                <p className="text-base font-bold mt-0.5 text-emerald-600">{resolvedToday.length}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-7">All Alerts</TabsTrigger>
            <TabsTrigger value="active" className="text-xs h-7">Active</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs h-7">Resolved</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs h-7">Rules</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs"
              onClick={handleGenerateAlerts}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isGenerating ? "Checking..." : "Check Now"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs"
              onClick={() => setIsConfigOpen(true)}
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Configure
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center mt-4">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {alertTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Branch" />
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
        </div>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <Card className="glass">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 font-medium">No alerts found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              paginatedAlerts.map((alert) => {
                const Icon = getAlertIcon(alert.type);
                return (
                  <Card
                    key={alert.id}
                    className={cn(
                      "glass transition-smooth hover:card-shadow-hover",
                      getSeverityColor(alert.severity)
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/50">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-medium">{alert.title}</h4>
                              <p className="text-sm mt-1">{alert.message}</p>
                              <div className="flex items-center gap-3 mt-2">
                                {alert.branchName && (
                                  <Badge variant="outline">{alert.branchName}</Badge>
                                )}
                                <span className="text-xs opacity-70">
                                  {formatDistanceToNow(alert.triggeredAt, { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getSeverityBadge(alert.severity)}
                              {getStatusBadge(alert.status)}
                            </div>
                          </div>
                          {alert.status !== "resolved" && alert.status !== "dismissed" && (
                            <div className="flex gap-2 mt-4">
                              {alert.status !== "acknowledged" && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleAcknowledge(alert.id)}
                                  disabled={actionLoadingId === alert.id}
                                >
                                  {actionLoadingId === alert.id ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  ) : (
                                    <Eye className="mr-2 h-3 w-3" />
                                  )}
                                  Acknowledge
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleResolve(alert.id)}
                                disabled={actionLoadingId === alert.id}
                              >
                                {actionLoadingId === alert.id ? (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="mr-2 h-3 w-3" />
                                )}
                                Resolve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDismiss(alert.id)}
                                disabled={actionLoadingId === alert.id}
                              >
                                {actionLoadingId === alert.id ? (
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="mr-2 h-3 w-3" />
                                )}
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
            {filteredAlerts.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredAlerts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <div className="space-y-4">
            {alerts
              .filter((a) => a.status !== "resolved" && a.status !== "dismissed")
              .map((alert) => {
                const Icon = getAlertIcon(alert.type);
                return (
                  <Card
                    key={alert.id}
                    className={cn("glass", getSeverityColor(alert.severity))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/50">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm mt-1">{alert.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {alert.branchName && (
                              <Badge variant="outline">{alert.branchName}</Badge>
                            )}
                            <span className="text-xs opacity-70">
                              {formatDistanceToNow(alert.triggeredAt, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {getSeverityBadge(alert.severity)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        <TabsContent value="resolved" className="mt-6">
          <div className="space-y-4">
            {resolvedToday.length === 0 ? (
              <Card className="glass">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="mt-4 font-medium">No Resolved Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Resolved alerts will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              resolvedToday.map((alert) => {
                const Icon = getAlertIcon(alert.type);
                return (
                  <Card
                    key={alert.id}
                    className="glass border-emerald-200/50 dark:border-emerald-800/50"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <Icon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-medium">{alert.title}</h4>
                              <p className="text-sm mt-1 text-muted-foreground">{alert.message}</p>
                              <div className="flex items-center gap-3 mt-2">
                                {alert.branchName && (
                                  <Badge variant="outline">{alert.branchName}</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Resolved {formatDistanceToNow(alert.triggeredAt, { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Resolved
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Alert Rules Configuration</CardTitle>
              <CardDescription>
                Configure automated alert triggers for your operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">Sales Drop Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when daily sales drop more than 25% compared to last week
                    </p>
                  </div>
                  <Switch
                    checked={alertRules.salesDrop}
                    onCheckedChange={(checked) => setAlertRules({ ...alertRules, salesDrop: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">Low Stock Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when inventory falls below reorder point
                    </p>
                  </div>
                  <Switch
                    checked={alertRules.lowStock}
                    onCheckedChange={(checked) => setAlertRules({ ...alertRules, lowStock: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">Waste Spike Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when waste exceeds 2x the weekly average
                    </p>
                  </div>
                  <Switch
                    checked={alertRules.wasteSpike}
                    onCheckedChange={(checked) => setAlertRules({ ...alertRules, wasteSpike: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">Staff Shortage Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when on-duty staff falls below 80% of required
                    </p>
                  </div>
                  <Switch
                    checked={alertRules.staffShortage}
                    onCheckedChange={(checked) => setAlertRules({ ...alertRules, staffShortage: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">Target Achievement Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Notify when branch achieves or misses targets
                    </p>
                  </div>
                  <Switch
                    checked={alertRules.targetAchieved}
                    onCheckedChange={(checked) => setAlertRules({ ...alertRules, targetAchieved: checked })}
                  />
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <Button onClick={() => toast.success("Alert rules saved")} className="w-full sm:w-auto">
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alert Configuration</DialogTitle>
            <DialogDescription>
              Configure how alerts are generated and who receives notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Notification Preferences</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notif" className="flex-1">
                  <span className="font-medium">Email Notifications</span>
                  <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                </Label>
                <Switch id="email-notif" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="critical-only" className="flex-1">
                  <span className="font-medium">Critical Only</span>
                  <p className="text-xs text-muted-foreground">Only notify for critical/high severity</p>
                </Label>
                <Switch id="critical-only" />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm">Check Frequency</h4>
              <Select defaultValue="15">
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 minutes</SelectItem>
                  <SelectItem value="15">Every 15 minutes</SelectItem>
                  <SelectItem value="30">Every 30 minutes</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm">Alert Thresholds</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales-threshold">Sales Drop %</Label>
                  <Input id="sales-threshold" type="number" defaultValue="25" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waste-threshold">Waste Spike %</Label>
                  <Input id="waste-threshold" type="number" defaultValue="100" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
