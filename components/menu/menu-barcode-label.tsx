"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface MenuBarcodeLabelProps {
  sku: string;
  productName: string;
  price?: string;
  className?: string;
  showPrintButton?: boolean;
}

export function MenuBarcodeLabel({
  sku,
  productName,
  price,
  className,
  showPrintButton = false,
}: MenuBarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !sku.trim()) return;
    try {
      JsBarcode(svgRef.current, sku.trim().toUpperCase(), {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 60,
        margin: 8,
      });
    } catch {
      // Invalid SKU for barcode encoding — leave SVG empty
    }
  }, [sku]);

  if (!sku.trim()) return null;

  return (
    <div className={className}>
      <p className="text-sm font-medium text-center">{productName}</p>
      {price ? (
        <p className="text-xs text-muted-foreground text-center">{price}</p>
      ) : null}
      <div className="flex justify-center">
        <svg ref={svgRef} className="max-w-full" />
      </div>
      {showPrintButton ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() =>
              printMenuBarcodeLabel({
                sku,
                productName,
                price,
              })
            }
          >
            <Printer className="mr-2 h-3.5 w-3.5" />
            Print label
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function printMenuBarcodeLabel({
  sku,
  productName,
  price,
}: {
  sku: string;
  productName: string;
  price?: string;
}) {
  const printWindow = window.open("", "_blank", "width=320,height=480");
  if (!printWindow) return;

  const container = printWindow.document.createElement("div");
  container.style.padding = "8px";
  container.style.textAlign = "center";
  container.style.fontFamily = "system-ui, sans-serif";

  const title = printWindow.document.createElement("p");
  title.textContent = productName;
  title.style.fontSize = "14px";
  title.style.fontWeight = "600";
  title.style.margin = "0 0 4px";
  container.appendChild(title);

  if (price) {
    const priceEl = printWindow.document.createElement("p");
    priceEl.textContent = price;
    priceEl.style.fontSize = "12px";
    priceEl.style.margin = "0 0 8px";
    priceEl.style.color = "#666";
    container.appendChild(priceEl);
  }

  const svg = printWindow.document.createElementNS("http://www.w3.org/2000/svg", "svg");
  container.appendChild(svg);

  try {
    JsBarcode(svg, sku.trim().toUpperCase(), {
      format: "CODE128",
      displayValue: true,
      fontSize: 14,
      height: 60,
      margin: 4,
      width: 1.5,
    });
  } catch {
    printWindow.close();
    return;
  }

  printWindow.document.body.appendChild(container);
  const style = printWindow.document.createElement("style");
  style.textContent = `
    @page { size: 58mm auto; margin: 4mm; }
    body { margin: 0; }
  `;
  printWindow.document.head.appendChild(style);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
