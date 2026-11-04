import { describe, expect, it } from "vitest";
import {
  buildPaystackCallbackUrl,
  isAllowedPaystackCallbackUrl,
} from "./paystack-callback";

describe("buildPaystackCallbackUrl", () => {
  it("builds dynamic return URL from origin", () => {
    expect(buildPaystackCallbackUrl("https://shop.example.com/", "ORD-1")).toBe(
      "https://shop.example.com/order/ORD-1?paystack=1",
    );
  });
});

describe("isAllowedPaystackCallbackUrl", () => {
  it("accepts same request origin order path", () => {
    expect(
      isAllowedPaystackCallbackUrl("https://shop.example.com/order/ORD-1?paystack=1", {
        requestOrigin: "https://shop.example.com",
      }),
    ).toBe(true);
  });

  it("rejects foreign host when allowlist is set", () => {
    expect(
      isAllowedPaystackCallbackUrl("https://evil.example/order/ORD-1", {
        requestOrigin: "https://shop.example.com",
      }),
    ).toBe(false);
  });

  it("rejects non-order paths", () => {
    expect(
      isAllowedPaystackCallbackUrl("https://shop.example.com/login", {
        requestOrigin: "https://shop.example.com",
      }),
    ).toBe(false);
  });
});
