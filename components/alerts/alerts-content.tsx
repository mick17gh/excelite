"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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

export function AlertsContent({ alerts, branches }: AlertsContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const filteredAlerts = alerts.filter((alert) => {
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
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="text-xl font-bold">{activeAlerts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requiring attention
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Bell className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-xl font-bold text-red-600">{criticalAlerts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Immediate action needed
                </p>
              </div>
              <div className="rounded-xl bg-red-100 dark:bg-red-900/30 p-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-xl font-bold text-orange-600">{highAlerts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Should address soon
                </p>
              </div>
              <div className="rounded-xl bg-orange-100 dark:bg-orange-900/30 p-3">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved Today</p>
                <p className="text-xl font-bold text-emerald-600">{resolvedToday.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Successfully handled
                </p>
              </div>
              <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All Alerts</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Configure Alerts
          </Button>
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
              filteredAlerts.map((alert) => {
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
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-background/50">
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
                              <Button size="sm" variant="outline">
                                <Eye className="mr-2 h-3 w-3" />
                                Acknowledge
                              </Button>
                              <Button size="sm" variant="outline">
                                <Check className="mr-2 h-3 w-3" />
                                Resolve
                              </Button>
                              <Button size="sm" variant="ghost">
                                <X className="mr-2 h-3 w-3" />
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
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-background/50">
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
          <Card className="glass">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="mt-4 font-medium">Resolved Alerts</h3>
              <p className="text-sm text-muted-foreground">
                {resolvedToday.length} alerts resolved today
              </p>
            </CardContent>
          </Card>
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
                  <div>
                    <p className="font-medium">Sales Drop Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when daily sales drop more than 15%
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Low Stock Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when inventory falls below minimum threshold
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Waste Spike Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when waste exceeds 20% above average
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Staff Shortage Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when staffing falls below required levels
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Target Achievement Alert</p>
                    <p className="text-sm text-muted-foreground">
                      Trigger when branch exceeds monthly target
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
