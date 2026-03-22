"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, Building2, Users, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { getAllOrganizations, updateOrganization } from "@/lib/actions/organization";
import { SubscriptionTier } from "@/lib/generated/prisma/client";

interface Organization {
  id: string;
  name: string;
  tier: string;
  status: string;
  maxBranches: number;
  maxUsers: number;
  userCount: number;
  branchCount: number;
  warehouseCount: number;
  subscription: {
    tier: string;
    status: string;
    amount: number;
    currency: string;
    nextBillingDate: string | null;
  } | null;
  createdAt: string;
}

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-700",
  PRO: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-amber-100 text-amber-700",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  TRIAL: "bg-blue-100 text-blue-700",
  PAST_DUE: "bg-orange-100 text-orange-700",
  CANCELED: "bg-red-100 text-red-700",
  EXPIRED: "bg-slate-100 text-slate-700",
};

export function PlatformAdminTab() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      const result = await getAllOrganizations();
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setOrganizations(result.data);
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
      toast.error("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTierChange = async (orgId: string, newTier: SubscriptionTier) => {
    setUpdatingOrgId(orgId);
    try {
      const result = await updateOrganization({ id: orgId, tier: newTier });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Tier updated successfully");
        await loadOrganizations();
      }
    } catch (error) {
      console.error("Failed to update tier:", error);
      toast.error("Failed to update tier");
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === "all" || org.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const totalOrgs = organizations.length;
  const freeOrgs = organizations.filter((o) => o.tier === "FREE").length;
  const proOrgs = organizations.filter((o) => o.tier === "PRO").length;
  const enterpriseOrgs = organizations.filter((o) => o.tier === "ENTERPRISE").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Total Organizations</p>
                <p className="text-base font-bold mt-0.5">{totalOrgs}</p>
              </div>
              <div className="icon-blue rounded-lg p-1.5 shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Free Tier</p>
                <p className="text-base font-bold mt-0.5">{freeOrgs}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-slate-100">
                <TrendingUp className="h-4 w-4 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Pro Tier</p>
                <p className="text-base font-bold mt-0.5 text-purple-600">{proOrgs}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-purple-100">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card rounded-xl">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground truncate">Enterprise</p>
                <p className="text-base font-bold mt-0.5 text-amber-600">{enterpriseOrgs}</p>
              </div>
              <div className="rounded-lg p-1.5 shrink-0 bg-amber-100">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="FREE">Free</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Organizations Table */}
      <Card className="chart-card rounded-xl">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">All Organizations</CardTitle>
          <CardDescription className="text-xs">Manage subscription tiers for all organizations</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Current Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Change Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{org.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={TIER_COLORS[org.tier] || "bg-slate-100 text-slate-700"}>
                      {org.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[org.status] || "bg-slate-100 text-slate-700"}>
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{org.userCount}/{org.maxUsers} users</p>
                      <p className="text-xs text-muted-foreground">
                        {org.branchCount} branches • {org.warehouseCount} warehouses
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString("en-US", { 
                      year: "numeric", 
                      month: "short", 
                      day: "numeric" 
                    })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={org.tier}
                      onValueChange={(value) => handleTierChange(org.id, value as SubscriptionTier)}
                      disabled={updatingOrgId === org.id}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FREE">Free</SelectItem>
                        <SelectItem value="PRO">Pro</SelectItem>
                        <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredOrganizations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No organizations found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
