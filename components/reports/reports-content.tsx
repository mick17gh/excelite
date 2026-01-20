"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Trash2,
  BarChart3,
  Clock,
  FileSpreadsheet,
  FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface ReportsContentProps {
  branches: Branch[];
}

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  frequency: string;
}

const reportTypes: ReportType[] = [
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level overview of all operations including KPIs, revenue, and key metrics",
    icon: TrendingUp,
    category: "Executive",
    frequency: "Weekly",
  },
  {
    id: "weekly-performance",
    name: "Weekly Performance Digest",
    description: "Detailed weekly performance analysis across all branches",
    icon: BarChart3,
    category: "Performance",
    frequency: "Weekly",
  },
  {
    id: "sales-report",
    name: "Sales & Revenue Report",
    description: "Comprehensive sales data by channel, daypart, and menu items",
    icon: DollarSign,
    category: "Sales",
    frequency: "Daily",
  },
  {
    id: "inventory-report",
    name: "Inventory Status Report",
    description: "Current stock levels, low stock alerts, and inventory valuation",
    icon: Package,
    category: "Inventory",
    frequency: "Daily",
  },
  {
    id: "waste-variance",
    name: "Waste & Variance Report",
    description: "Waste analysis, shrinkage tracking, and variance explanations",
    icon: Trash2,
    category: "Operations",
    frequency: "Weekly",
  },
  {
    id: "staff-report",
    name: "Staff Scheduling Report",
    description: "Staff utilization, shift coverage, and labor cost analysis",
    icon: Users,
    category: "HR",
    frequency: "Weekly",
  },
];

export function ReportsContent({ branches }: ReportsContentProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const handleGenerateReport = async (reportId: string) => {
    setGeneratingReport(reportId);
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setGeneratingReport(null);
    // In production, this would trigger actual report generation
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Executive":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "Performance":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "Sales":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "Inventory":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "Operations":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "HR":
        return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Parameters */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Report Parameters
          </CardTitle>
          <CardDescription>
            Configure date range and branch selection for your reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="text-sm font-medium mb-2 block">Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
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
          </div>
          {dateRange?.from && dateRange?.to && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Report period: {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Reports */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isGenerating = generatingReport === report.id;
            return (
              <Card
                key={report.id}
                className="glass transition-smooth hover:card-shadow-hover"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="rounded-xl bg-primary/10 p-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge className={getCategoryColor(report.category)}>
                      {report.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{report.name}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{report.frequency}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileType className="mr-2 h-4 w-4" />
                          PDF
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={isGenerating}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                name: "Executive Summary",
                date: "Jan 19, 2026",
                format: "PDF",
                size: "2.4 MB",
              },
              {
                name: "Weekly Performance Digest",
                date: "Jan 18, 2026",
                format: "PDF",
                size: "1.8 MB",
              },
              {
                name: "Sales & Revenue Report",
                date: "Jan 17, 2026",
                format: "Excel",
                size: "3.2 MB",
              },
            ].map((report, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-smooth"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    {report.format === "PDF" ? (
                      <FileType className="h-4 w-4 text-primary" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.date} • {report.size}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
