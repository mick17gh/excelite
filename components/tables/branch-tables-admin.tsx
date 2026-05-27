"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import {
  bulkCreateDiningTables,
  clearTable,
  createDiningSection,
  createDiningTable,
  deleteDiningSection,
  deleteDiningTable,
  getBranchTableSetup,
  setTableBlocked,
  updateDiningSection,
  updateDiningTable,
} from "@/lib/actions/tables";
import { Loader2, Plus } from "lucide-react";
import { FloorPlanEditor } from "@/components/tables/floor-plan-editor";

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  SEATED: "bg-blue-100 text-blue-800",
  ORDERING: "bg-amber-100 text-amber-800",
  BILL_REQUESTED: "bg-orange-100 text-orange-800",
  DIRTY: "bg-slate-100 text-slate-800",
  BLOCKED: "bg-red-100 text-red-800",
};

interface BranchTablesAdminProps {
  branchId: string;
  branchName: string;
}

export function BranchTablesAdmin({ branchId, branchName }: BranchTablesAdminProps) {
  const [isPending, startTransition] = useTransition();
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [tables, setTables] = useState<
    {
      id: string;
      label: string;
      status: string;
      capacity: number;
      sectionId: string | null;
      sectionName: string | null;
      posX: number | null;
      posY: number | null;
      openSession: { guestCount: number; openedByName: string } | null;
    }[]
  >([]);
  const [sectionName, setSectionName] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [tableSectionId, setTableSectionId] = useState<string>("none");
  const [tableCapacity, setTableCapacity] = useState(4);
  const [bulkPrefix, setBulkPrefix] = useState("T");
  const [bulkFrom, setBulkFrom] = useState(1);
  const [bulkTo, setBulkTo] = useState(10);
  const [bulkCapacity, setBulkCapacity] = useState(4);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableLabel, setEditingTableLabel] = useState("");
  const [editingTableCapacity, setEditingTableCapacity] = useState(4);
  const [editingTableSectionId, setEditingTableSectionId] = useState<string>("none");

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await getBranchTableSetup(branchId);
      if ("error" in res && res.error) {
        toast.error(res.error || "Failed to load tables");
        return;
      }
      if (!("data" in res) || !res.data) return;
      setSections(res.data.sections);
      setTables(res.data.tables);
    });
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Tables — {branchName}</h2>
        <p className="text-sm text-muted-foreground">
          Sections and table labels for dine-in service. Status updates automatically from POS.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <Badge key={status} variant="outline" className={cls}>
            {status.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add section</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="Main Hall"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
            <Button
              disabled={isPending || !sectionName.trim()}
              onClick={() => {
                startTransition(async () => {
                  const res = await createDiningSection({
                    branchId,
                    name: sectionName,
                  });
                  if ("error" in res && res.error) toast.error(res.error);
                  else {
                    toast.success("Section created");
                    setSectionName("");
                    load();
                  }
                });
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add table</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Table label"
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
            />
            <Select value={tableSectionId} onValueChange={setTableSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No section</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label htmlFor="table-capacity">Capacity (seats)</Label>
              <Input
                id="table-capacity"
                type="number"
                min={1}
                max={99}
                value={tableCapacity}
                onChange={(e) => setTableCapacity(Number(e.target.value) || 1)}
              />
            </div>
            <Button
              className="w-full"
              disabled={isPending || !tableLabel.trim()}
              onClick={() => {
                startTransition(async () => {
                  const res = await createDiningTable({
                    branchId,
                    label: tableLabel,
                    sectionId: tableSectionId === "none" ? null : tableSectionId,
                    capacity: tableCapacity,
                  });
                  if ("error" in res && res.error) toast.error(res.error);
                  else {
                    toast.success("Table created");
                    setTableLabel("");
                    load();
                  }
                });
              }}
            >
              Add table
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections yet.</p>
          ) : (
            sections.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md border p-2">
                {editingSectionId === s.id ? (
                  <>
                    <Input
                      value={editingSectionName}
                      onChange={(e) => setEditingSectionName(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        startTransition(async () => {
                          const res = await updateDiningSection({
                            sectionId: s.id,
                            name: editingSectionName,
                          });
                          if ("error" in res && res.error) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success("Section updated");
                          setEditingSectionId(null);
                          setEditingSectionName("");
                          load();
                        })
                      }
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingSectionId(null);
                        setEditingSectionName("");
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSectionId(s.id);
                        setEditingSectionName(s.name);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        startTransition(async () => {
                          if (
                            !window.confirm(
                              "Delete section? Tables in it will become unassigned.",
                            )
                          )
                            return;
                          const res = await deleteDiningSection(s.id);
                          if ("error" in res && res.error) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success("Section deleted");
                          load();
                        })
                      }
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk create</CardTitle>
          <CardDescription>e.g. prefix T, tables 1–20 → T1…T20</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={tableSectionId} onValueChange={setTableSectionId}>
            <SelectTrigger>
              <SelectValue placeholder="Section (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No section</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Prefix</Label>
            <Input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} />
          </div>
          <div>
            <Label>From</Label>
            <Input
              type="number"
              min={1}
              value={bulkFrom}
              onChange={(e) => setBulkFrom(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>To</Label>
            <Input
              type="number"
              min={1}
              value={bulkTo}
              onChange={(e) => setBulkTo(Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Capacity (each table)</Label>
            <Input
              type="number"
              min={1}
              max={99}
              value={bulkCapacity}
              onChange={(e) => setBulkCapacity(Number(e.target.value) || 1)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await bulkCreateDiningTables({
                    branchId,
                    prefix: bulkPrefix,
                    from: bulkFrom,
                    to: bulkTo,
                    sectionId: tableSectionId === "none" ? null : tableSectionId,
                    capacity: bulkCapacity,
                  });
                  if ("error" in res && res.error) toast.error(res.error);
                  else {
                    const created =
                      "data" in res && res.data ? res.data.created : 0;
                    toast.success(`Created ${created} tables`);
                    load();
                  }
                });
              }}
            >
              Create range
            </Button>
          </div>
          </div>
        </CardContent>
      </Card>

      <FloorPlanEditor
        tables={tables.map((t) => ({
          id: t.id,
          label: t.label,
          posX: t.posX,
          posY: t.posY,
        }))}
        onSaved={load}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All tables</CardTitle>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Open check</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {editingTableId === t.id ? (
                      <Input
                        value={editingTableLabel}
                        onChange={(e) => setEditingTableLabel(e.target.value)}
                      />
                    ) : (
                      t.label
                    )}
                  </TableCell>
                  <TableCell>
                    {editingTableId === t.id ? (
                      <Select value={editingTableSectionId} onValueChange={setEditingTableSectionId}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No section</SelectItem>
                          {sections.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      t.sectionName ?? "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingTableId === t.id ? (
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={editingTableCapacity}
                        onChange={(e) => setEditingTableCapacity(Number(e.target.value) || 1)}
                      />
                    ) : (
                      t.capacity
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[t.status] ?? ""}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.openSession
                      ? `${t.openSession.guestCount} covers · ${t.openSession.openedByName}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {editingTableId === t.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            startTransition(async () => {
                              const res = await updateDiningTable({
                                tableId: t.id,
                                label: editingTableLabel,
                                capacity: editingTableCapacity,
                                sectionId:
                                  editingTableSectionId === "none" ? null : editingTableSectionId,
                              });
                              if ("error" in res && res.error) {
                                toast.error(res.error);
                                return;
                              }
                              toast.success("Table updated");
                              setEditingTableId(null);
                              load();
                            })
                          }
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTableId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTableId(t.id);
                          setEditingTableLabel(t.label);
                          setEditingTableCapacity(t.capacity);
                          setEditingTableSectionId(t.sectionId ?? "none");
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    {t.status === "DIRTY" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          startTransition(async () => {
                            const res = await clearTable(t.id);
                            if ("error" in res && res.error) toast.error(res.error);
                            else {
                              toast.success("Table cleared");
                              load();
                            }
                          });
                        }}
                      >
                        Clear
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        startTransition(async () => {
                          const blocked = t.status !== "BLOCKED";
                          const res = await setTableBlocked(t.id, blocked);
                          if ("error" in res && res.error) toast.error(res.error);
                          else load();
                        });
                      }}
                    >
                      {t.status === "BLOCKED" ? "Unblock" : "Block"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        startTransition(async () => {
                          if (!window.confirm("Delete this table?")) return;
                          const res = await deleteDiningTable(t.id);
                          if ("error" in res && res.error) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success("Table deleted");
                          load();
                        })
                      }
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
