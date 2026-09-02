import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBarcodeScanner } from "./use-barcode-scanner";

describe("useBarcodeScanner", () => {
  it("does not emit when disabled", () => {
    const onScan = vi.fn();
    renderHook(() => useBarcodeScanner({ enabled: false, onScan }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "A", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onScan).not.toHaveBeenCalled();
  });

  it("emits buffered scan on Enter when enabled", () => {
    const onScan = vi.fn();
    renderHook(() => useBarcodeScanner({ enabled: true, onScan }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "B", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "R", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "G", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "-", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onScan).toHaveBeenCalledWith("BRG-001");
  });
});
