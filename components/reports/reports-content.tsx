"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ChefHat,
  UtensilsCrossed,
  LayoutGrid,
  ClipboardCheck,
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
  tableManagementEnabled?: boolean;
}

interface ReportType {
  id: ReportId;
  name: string;
  description: string;
  icon: React.ElementType;
  category: string;
  frequency: string;
  tableManagementOnly?: boolean;
}

const reportTypes: ReportType[] = [
  {
    id: "executive-summary",
    name: "Executive Performance & Insight",
    description: "Per-branch P&L, margins, YTD growth, and customer loyalty metrics",
    icon: TrendingUp,
    category: "Executive",
    frequency: "Weekly",
  },
  {
    id: "weekly-performance",
    name: "Weekly Performance Digest",
    description: "Daily sales, WoW growth, peak hours, labor cost, and void/refund tracking",
    icon: BarChart3,
    category: "Performance",
    frequency: "Weekly",
  },
  {
    id: "kitchen-efficiency",
    name: "Kitchen & Operational Efficiency",
    description: "Prep times, SLA variance, and kitchen throughput KPIs",
    icon: ChefHat,
    category: "Operations",
    frequency: "Daily",
  },
  {
    id: "menu-performance",
    name: "Menu Performance",
    description: "Item profitability, add-on rates, and Star/Dog/Puzzle/Workhorse ranking",
    icon: UtensilsCrossed,
    category: "Sales",
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
    description:
      "Transfers to branches, inbound receipts, warehouse waste, and outbound usage/adjustments in the period",
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
    id: "reconciliation-summary",
    name: "Stock Reconciliation Summary",
    description: "End-of-shift count sessions with shortage, overage, and variance cost by branch",
    icon: ClipboardCheck,
    category: "Inventory",
    frequency: "Daily",
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
    id: "dine-in-service",
    name: "Dine-In & Table Service",
    description: "Closed table sessions: covers, revenue per cover, and turn times",
    icon: UtensilsCrossed,
    category: "Operations",
    frequency: "Daily",
    tableManagementOnly: true,
  },
  {
    id: "waiter-performance",
    name: "Waiter Performance",
    description: "Tables served, covers, sales, and average turn time by waiter",
    icon: Users,
    category: "Operations",
    frequency: "Weekly",
    tableManagementOnly: true,
  },
  {
    id: "table-section-performance",
    name: "Table Section Performance",
    description: "Dine-in metrics grouped by dining section",
    icon: LayoutGrid,
    category: "Operations",
    frequency: "Weekly",
    tableManagementOnly: true,
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
    name: "POS Terminal Report",
    description: "Terminal payments by method, MoMo references, and success/fail status",
    icon: CreditCard,
    category: "Finance",
    frequency: "Daily",
  },
];

export function ReportsContent({
  branches,
  tableManagementEnabled = false,
}: ReportsContentProps) {
  const visibleReports = reportTypes.filter(
    (r) => !r.tableManagementOnly || tableManagementEnabled,
  );
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
            const reportType = visibleReports.find((r) => r.id === reportId)!;
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
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-[min(96vw,72rem)] max-w-[72rem] min-w-0 flex-col gap-0 overflow-hidden p-0">
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

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
              <div className="space-y-6 pb-2">
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
                  const columnCount = Object.keys(value[0] as object).length;

                  return (
                    <div key={key} className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-semibold capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </h3>
                        {columnCount > 6 && (
                          <p className="text-xs text-muted-foreground">
                            Scroll horizontally to see all columns
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg border bg-background shadow-sm">
                        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                          <table className="w-max min-w-full border-collapse text-sm">
                            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                              <tr>
                                {Object.keys(value[0]).map((col) => (
                                  <th key={col} className="px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {value.map((row, index) => (
                                <tr key={index} className="border-t hover:bg-muted/30">
                                  {Object.entries(row as Record<string, unknown>).map(([col, val]) => {
                                    const isNum = typeof val === "number";
                                    const colLower = col.toLowerCase();
                                    const isPercentCol =
                                      colLower.includes("%") ||
                                      colLower.includes("margin") ||
                                      colLower.includes("growth") ||
                                      colLower.includes("contribution") ||
                                      colLower.includes("retention") ||
                                      colLower.includes("mix") ||
                                      colLower.includes("rate") ||
                                      colLower.includes("accuracy");
                                    const isMoneyCol =
                                      colLower.includes("revenue") ||
                                      colLower.includes("cost") ||
                                      colLower.includes("value") ||
                                      colLower.includes("profit") ||
                                      colLower.includes("amount") ||
                                      colLower.includes("aov") ||
                                      colLower.includes("(ghs)");
                                    const display = isNum
                                      ? isMoneyCol && !isPercentCol
                                        ? formatCurrency(val)
                                        : isPercentCol && val <= 1 && val >= -1
                                          ? `${(val * 100).toFixed(1)}%`
                                          : isPercentCol
                                            ? `${val}%`
                                            : val.toLocaleString()
                                      : String(val);
                                    return (
                                      <td
                                        key={col}
                                        className="px-3 py-2 text-xs whitespace-nowrap tabular-nums"
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
          {visibleReports.map((report) => {
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
