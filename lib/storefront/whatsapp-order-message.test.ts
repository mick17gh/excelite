import { describe, expect, it } from "vitest";
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppOrderUrl,
} from "./whatsapp-order-message";

describe("buildWhatsAppOrderMessage", () => {
  it("matches the expected cart handoff format", () => {
    const message = buildWhatsAppOrderMessage({
      storeName: "VortexTM",
      orderType: "Pickup",
      branchName: "Serv 1 -  Labone",
      items: [
        { quantity: 1, name: "Flicks Special Pizza", optionsLabel: "Cheese", lineTotal: 165 },
        { quantity: 1, name: "Cheesesteak", optionsLabel: "Chicken", lineTotal: 140 },
        { quantity: 1, name: "Meat Plata", lineTotal: 430 },
      ],
      itemsTotal: 735,
      taxIncludedAmount: 122.5,
      amount: 735,
      currency: "GHS",
      customerName: "Addo",
      customerPhone: "024211111",
    });

    expect(message).toContain("New order — VortexTM");
    expect(message).toContain("Type: Pickup");
    expect(message).toContain("Branch: Serv 1 -  Labone");
    expect(message).toContain("• 1× Flicks Special Pizza (Cheese) — GHS 165.00");
    expect(message).toContain("Items total: GHS 735.00");
    expect(message).toContain("Tax included: GHS 122.50");
    expect(message).toContain("Amount: GHS 735.00");
    expect(message).toContain("Name: Addo");
    expect(message).toContain("Phone: 024211111");
  });
});

describe("buildWhatsAppOrderUrl", () => {
  it("encodes message for wa.me", () => {
    const url = buildWhatsAppOrderUrl("+233242111111", "Hello world");
    expect(url).toBe("https://wa.me/233242111111?text=Hello%20world");
  });
});
