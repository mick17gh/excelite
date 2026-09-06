import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUserIdle } from "@/hooks/use-user-idle";

describe("useUserIdle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays active until idleAfterMs elapses", () => {
    const { result } = renderHook(() => useUserIdle(5_000));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(4_999);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(true);
  });

  it("resets when activity fires", () => {
    const { result } = renderHook(() => useUserIdle(5_000));

    act(() => {
      vi.advanceTimersByTime(4_000);
      window.dispatchEvent(new Event("keydown"));
      vi.advanceTimersByTime(4_000);
    });
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current).toBe(true);
  });

  it("never idles when idleAfterMs is null", () => {
    const { result } = renderHook(() => useUserIdle(null));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(false);
  });
});
