"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { getActiveSessions, revokeSession } from "@/lib/actions/settings";
import type { ActiveSessionRow } from "@/lib/actions/settings";
import { TablePagination } from "@/components/ui/table-pagination";

function parseUserAgent(ua: string) {
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edge")) return "Edge";
  return "Unknown Browser";
}

export function ActiveSessionsCard() {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ActiveSessionRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadSessions = useCallback(async (page: number, size: number) => {
    setLoading(true);
    const result = await getActiveSessions({ page, pageSize: size });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error || "Failed to load sessions");
      setSessions([]);
      setTotalItems(0);
      setTotalPages(1);
      return;
    }

    setSessions(result.data);
    setTotalItems(result.total);
    setTotalPages(result.totalPages);

    if (page > result.totalPages && result.totalPages > 0) {
      setCurrentPage(result.totalPages);
    }
  }, []);

  useEffect(() => {
    loadSessions(currentPage, pageSize);
  }, [currentPage, pageSize, loadSessions]);

  const handleRevokeSession = (sessionId: string) => {
    startTransition(async () => {
      const result = await revokeSession(sessionId);

      if (result.success) {
        toast.success("Session revoked");
        const nextPage =
          sessions.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
        if (nextPage !== currentPage) {
          setCurrentPage(nextPage);
        } else {
          await loadSessions(currentPage, pageSize);
        }
      } else {
        toast.error(result.error || "Failed to revoke session");
      }
    });
  };

  return (
    <Card className="chart-card rounded-xl">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">Active Sessions</CardTitle>
        <CardDescription className="text-xs">
          Manage your active login sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No active sessions found</p>
        ) : (
          <>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-lg border text-sm"
                >
                  <div>
                    <p className="font-medium text-xs">{parseUserAgent(session.userAgent)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {session.ipAddress} •{" "}
                      {session.isCurrent ? "Current session" : "Active"}
                    </p>
                  </div>
                  {session.isCurrent ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px] h-5">
                      Current
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={isPending}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {totalItems > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[5, 10, 20]}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
