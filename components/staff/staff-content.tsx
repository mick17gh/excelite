"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Users,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffSummary {
  branchId: string;
  branchName: string;
  totalStaff: number;
  onDuty: number;
  required: number;
  status: "adequate" | "understaffed" | "overstaffed";
}

interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  branchName: string;
  shiftStart: string;
  shiftEnd: string;
  status: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface StaffContentProps {
  summary: StaffSummary[];
  schedule: StaffMember[];
  branches: Branch[];
}

export function StaffContent({ summary, schedule, branches }: StaffContentProps) {
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const totalStaff = summary.reduce((sum, s) => sum + s.totalStaff, 0);
  const totalOnDuty = summary.reduce((sum, s) => sum + s.onDuty, 0);
  const totalRequired = summary.reduce((sum, s) => sum + s.required, 0);
  const understaffedBranches = summary.filter((s) => s.status === "understaffed").length;

  const filteredSchedule = schedule.filter((staff) => {
    const matchesBranch = branchFilter === "all" || 
      branches.find((b) => b.name === staff.branchName)?.id === branchFilter;
    const matchesStatus = statusFilter === "all" || staff.status === statusFilter;
    return matchesBranch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ON_DUTY":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            On Duty
          </Badge>
        );
      case "OFF_DUTY":
        return (
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
            Off Duty
          </Badge>
        );
      case "ON_LEAVE":
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            On Leave
          </Badge>
        );
      case "SICK":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Sick
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBranchStatusBadge = (status: string) => {
    switch (status) {
      case "adequate":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Adequate
          </Badge>
        );
      case "understaffed":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="mr-1 h-3 w-3" />
            Understaffed
          </Badge>
        );
      case "overstaffed":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Overstaffed
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      MANAGER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      KITCHEN: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      SERVICE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      CASHIER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      DELIVERY: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    };
    return <Badge className={colors[role] || "bg-slate-100 text-slate-700"}>{role}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-xl font-bold">{totalStaff}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all branches
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Currently On Duty</p>
                <p className="text-xl font-bold text-emerald-600">{totalOnDuty}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalRequired} required
                </p>
              </div>
              <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-3">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Off Duty</p>
                <p className="text-xl font-bold">{totalStaff - totalOnDuty}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Available for scheduling
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 dark:bg-slate-900/30 p-3">
                <UserX className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass",
          understaffedBranches > 0 && "border-red-200 dark:border-red-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Understaffed Branches</p>
                <p className={cn(
                  "text-xl font-bold",
                  understaffedBranches > 0 ? "text-red-600" : "text-emerald-600"
                )}>
                  {understaffedBranches}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {understaffedBranches > 0 ? "Need attention" : "All branches covered"}
                </p>
              </div>
              <div className={cn(
                "rounded-xl p-3",
                understaffedBranches > 0 
                  ? "bg-red-100 dark:bg-red-900/30" 
                  : "bg-emerald-100 dark:bg-emerald-900/30"
              )}>
                <AlertCircle className={cn(
                  "h-5 w-5",
                  understaffedBranches > 0 ? "text-red-600" : "text-emerald-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="overview">Branch Overview</TabsTrigger>
            <TabsTrigger value="schedule">Today's Schedule</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        </div>

        <TabsContent value="overview" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Staff by Branch</CardTitle>
              <CardDescription>Current staffing levels across all branches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {summary.map((branch) => {
                  const percentage = Math.min((branch.onDuty / branch.required) * 100, 100);
                  return (
                    <div key={branch.branchId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{branch.branchName}</span>
                          {getBranchStatusBadge(branch.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {branch.onDuty} / {branch.required} required
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className={cn(
                          "h-2",
                          branch.status === "adequate" && "bg-emerald-100 [&>div]:bg-emerald-500",
                          branch.status === "understaffed" && "bg-red-100 [&>div]:bg-red-500",
                          branch.status === "overstaffed" && "bg-amber-100 [&>div]:bg-amber-500"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total staff: {branch.totalStaff}</span>
                        <span>On duty: {branch.onDuty}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription>Staff schedules for today</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-40">
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="ON_DUTY">On Duty</SelectItem>
                      <SelectItem value="OFF_DUTY">Off Duty</SelectItem>
                      <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                      <SelectItem value="SICK">Sick</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedule.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(staff.role)}</TableCell>
                      <TableCell>{staff.branchName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {staff.shiftStart} - {staff.shiftEnd}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(staff.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Staffing Analytics</CardTitle>
              <CardDescription>
                Insights on staffing patterns and efficiency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Staffing Efficiency</h4>
                  <p className="text-sm text-muted-foreground">
                    Analysis of staffing levels vs revenue correlation will be displayed here.
                  </p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Shift Coverage</h4>
                  <p className="text-sm text-muted-foreground">
                    Shift coverage patterns and gap analysis will be displayed here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
