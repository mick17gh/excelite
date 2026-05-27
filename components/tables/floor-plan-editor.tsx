"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDiningTableLayout } from "@/lib/actions/tables";
import { toast } from "sonner";

type TablePos = {
  id: string;
  label: string;
  posX: number | null;
  posY: number | null;
};

interface FloorPlanEditorProps {
  tables: TablePos[];
  onSaved?: () => void;
}

/** Phase 2: simple numeric layout positions for floor board grid placement */
export function FloorPlanEditor({ tables, onSaved }: FloorPlanEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [positions, setPositions] = useState<Record<string, { x: string; y: string }>>(
    () =>
      Object.fromEntries(
        tables.map((t) => [
          t.id,
          { x: String(t.posX ?? ""), y: String(t.posY ?? "") },
        ]),
      ),
  );

  const saveAll = () => {
    startTransition(async () => {
      for (const t of tables) {
        const p = positions[t.id];
        const x = p?.x === "" ? null : Number(p?.x);
        const y = p?.y === "" ? null : Number(p?.y);
        if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) continue;
        await updateDiningTableLayout({ tableId: t.id, posX: x, posY: y });
      }
      toast.success("Floor positions saved");
      onSaved?.();
    });
  };

  if (tables.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Floor plan positions</CardTitle>
        <CardDescription>
          Optional X/Y grid coordinates for the live floor board (drag editor in a later release)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm border rounded-md p-2">
              <span className="font-medium w-12 shrink-0">{t.label}</span>
              <Input
                className="h-8"
                placeholder="X"
                value={positions[t.id]?.x ?? ""}
                onChange={(e) =>
                  setPositions((prev) => ({
                    ...prev,
                    [t.id]: { ...prev[t.id], x: e.target.value },
                  }))
                }
              />
              <Input
                className="h-8"
                placeholder="Y"
                value={positions[t.id]?.y ?? ""}
                onChange={(e) =>
                  setPositions((prev) => ({
                    ...prev,
                    [t.id]: { ...prev[t.id], y: e.target.value },
                  }))
                }
              />
            </div>
          ))}
        </div>
        <Button size="sm" onClick={saveAll} disabled={isPending}>
          Save positions
        </Button>
      </CardContent>
    </Card>
  );
}
