"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Loader2,
  Eye,
  Building2,
  Truck,
  ShoppingCart,
  UserCircle,
  Store,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateReportData, type ReportId } from "@/lib/actions/reports";
import { downloadReportCSV, downloadReportXLSX } from "@/lib/utils/report-export";
import { useCurrency } from "@/contexts/currency-context";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface ReportsContentProps {
  branches: Branch[];
}

interface ReportType {
  id: ReportId;
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
    id: "manual-entries",
    name: "Manual Entries Report",
    description: "Summary of all manual POS entries including revenue by channel and branch",
    icon: FileText,
    category: "Sales",
    frequency: "Weekly",
  },
  {
    id: "inventory-report",
    name: "Branch Inventory Status",
    description:
      "On-hand stock at each branch (retail / kitchen). Hub stock is in warehouse reports.",
    icon: Package,
    category: "Inventory",
    frequency: "Daily",
  },
  {
    id: "warehouse-stock",
    name: "Warehouse Stock Report",
    description: "Central hub quantities, valuation, and low-stock lines by warehouse",
    icon: Building2,
    category: "Warehouse",
    frequency: "Daily",
  },
  {
    id: "warehouse-activity",
    name: "Warehouse Activity",
    description: "Transfers to branches, inbound receipts, and warehouse waste in the period",
    icon: Truck,
    category: "Warehouse",
    frequency: "Weekly",
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
  {
    id: "orders-overview",
    name: "Orders Overview",
    description: "Unified orders by status, source, channel type, and branch with line-level export",
    icon: ShoppingCart,
    category: "Orders",
    frequency: "Daily",
  },
  {
    id: "customer-insights",
    name: "Customer Insights",
    description: "Repeat buyers, revenue by customer, and ranking for loyalty follow-ups",
    icon: UserCircle,
    category: "Customers",
    frequency: "Weekly",
  },
  {
    id: "pos-sales-report",
    name: "POS Terminal Sales",
    description: "In-venue POS tickets, channels, and top menu items",
    icon: Store,
    category: "POS",
    frequency: "Daily",
  },
  {
    id: "cash-transactions",
    name: "Payment Transactions",
    description: "Recorded payments and tips by method (ties to POS / checkout activity)",
    icon: CreditCard,
    category: "Finance",
    frequency: "Daily",
  },
];

export function ReportsContent({ branches }: ReportsContentProps) {
  const { formatCurrency } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<{
    data: Record<string, unknown>;
    reportType: ReportType;
  } | null>(null);

  const handleGenerateReport = (reportId: ReportId, exportFormat?: "csv" | "excel") => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please select a date range");
      return;
    }

    setGeneratingReport(reportId);
    startTransition(async () => {
      try {
        const result = await generateReportData({
          reportId,
          branchId: selectedBranch === "all" ? undefined : selectedBranch,
          startDate: dateRange.from!,
          endDate: dateRange.to!,
        });

        if (result.success && result.data) {
          if (exportFormat === "csv") {
            exportReportToCSV(result.data, reportId);
            toast.success("Report exported to CSV");
          } else if (exportFormat === "excel") {
            exportReportToExcel(result.data, reportId);
            toast.success("Report exported to Excel");
          } else {
            // Show preview
            const reportType = reportTypes.find((r) => r.id === reportId)!;
            setViewingReport({ data: result.data, reportType });
          }
        } else {
          toast.error(result.error || "Failed to generate report");
        }
      } catch (error) {
        console.error("Error generating report:", error);
        toast.error("Failed to generate report");
      } finally {
        setGeneratingReport(null);
      }
    });
  };

  const exportReportToCSV = (data: Record<string, unknown>, reportId: ReportId) => {
    const reportName = (data.reportName as string) || reportId;
    const base = `${reportName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}`;
    downloadReportCSV(data, base);
  };

  const exportReportToExcel = (data: Record<string, unknown>, reportId: ReportId) => {
    const reportName = (data.reportName as string) || reportId;
    const base = `${reportName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}`;
    downloadReportXLSX(data, base);
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
      case "Warehouse":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "Orders":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "Customers":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400";
      case "POS":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400";
      case "Finance":
        return "bg-lime-100 text-lime-900 dark:bg-lime-900/30 dark:text-lime-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const renderReportPreview = () => {
    if (!viewingReport) return null;
    const { data, reportType } = viewingReport;
    const summary = data.summary as Record<string, unknown> | undefined;

    return (
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-[min(95vw,56rem)] max-w-4xl min-w-0 flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-left">
                <reportType.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{data.reportName as string}</span>
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground break-words">
              {data.branchName as string} • {format(new Date((data.period as { startDate: string; endDate: string })?.startDate), "MMM dd")} - {format(new Date((data.period as { startDate: string; endDate: string })?.endDate), "MMM dd, yyyy")}
            </p>
          </DialogHeader>

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full min-h-0 min-w-0 px-6 py-4">
              <div className="min-w-0 max-w-full space-y-6 pb-2">
                {/* Summary Section */}
                {summary && (
                  <div className="min-w-0">
                    <h3 className="mb-3 text-sm font-semibold">Summary</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(summary).map(([key, value]) => (
                        <div key={key} className="min-w-0 rounded-lg border p-3">
                          <p className="text-xs capitalize text-muted-foreground break-words">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold">
                            {typeof value === "number"
                              ? key.toLowerCase().includes("revenue") ||
                                key.toLowerCase().includes("cost") ||
                                key.toLowerCase().includes("profit") ||
                                key.toLowerCase().includes("value")
                                ? formatCurrency(value)
                                : key.toLowerCase().includes("percentage") ||
                                  key.toLowerCase().includes("utilization")
                                ? `${value}%`
                                : value.toLocaleString()
                              : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Array data sections */}
                {Object.entries(data).map(([key, value]) => {
                  if (!Array.isArray(value) || value.length === 0) return null;
                  
                  return (
                    <div key={key} className="min-w-0 max-w-full">
                      <h3 className="mb-3 text-sm font-semibold capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </h3>
                      <div className="min-w-0 max-w-full overflow-hidden rounded-lg border">
                        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                          <table className="w-full min-w-0 max-w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                {Object.keys(value[0]).map((col) => (
                                  <th key={col} className="px-3 py-2 text-left text-xs font-medium capitalize whitespace-nowrap">
                                    {col.replace(/([A-Z])/g, " $1").trim()}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {value.map((row, index) => (
                                <tr key={index} className="border-t">
                                  {Object.entries(row as Record<string, unknown>).map(([col, val]) => {
                                    const isNum = typeof val === "number";
                                    const display =
                                      isNum
                                        ? col.toLowerCase().includes("revenue") ||
                                          col.toLowerCase().includes("cost") ||
                                          col.toLowerCase().includes("value") ||
                                          col.toLowerCase().includes("pay")
                                          ? formatCurrency(val)
                                          : col.toLowerCase().includes("percentage")
                                            ? `${val}%`
                                            : val.toLocaleString()
                                        : String(val);
                                    return (
                                      <td
                                        key={col}
                                        className={
                                          isNum
                                            ? "px-3 py-2 text-xs whitespace-nowrap tabular-nums"
                                            : "max-w-[min(280px,55vw)] px-3 py-2 text-xs break-words sm:max-w-[min(360px,50vw)]"
                                        }
                                      >
                                        {display}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {value.length > 20 && (
                          <p className="text-xs text-muted-foreground text-center py-2 border-t bg-muted/30">
                            Showing all {value.length} items
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t shrink-0 bg-background">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportReportToCSV(data, reportType.id);
                toast.success("Exported to CSV");
              }}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportReportToExcel(data, reportType.id);
                toast.success("Exported to Excel");
              }}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>
            <Button size="sm" onClick={() => setViewingReport(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-4">
      {/* Report Parameters */}
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="icon-blue rounded-lg p-1.5">
              <FileText className="h-4 w-4" />
            </div>
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
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
        <h2 className="text-sm font-semibold mb-3">Available Reports</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isGenerating = generatingReport === report.id;
            return (
              <Card
                key={report.id}
                className="chart-card rounded-xl transition-all hover:shadow-md"
              >
                <CardHeader className="py-3 px-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="icon-blue rounded-lg p-1.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge className={cn(getCategoryColor(report.category), "text-[10px] h-5 px-1.5")}>
                      {report.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm mt-2">{report.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{report.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" />
                    <span>{report.frequency}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={isGenerating || isPending}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Preview
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleGenerateReport(report.id, "csv")}
                      disabled={isGenerating || isPending}
                      title="Export to CSV"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleGenerateReport(report.id, "excel")}
                      disabled={isGenerating || isPending}
                      title="Export to Excel"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Report Preview Dialog */}
      {renderReportPreview()}
    </div>
  );
}
