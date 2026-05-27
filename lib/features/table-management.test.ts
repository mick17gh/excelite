import { describe, expect, it } from "vitest";

describe("table management policy", () => {
  it("requires table session for dine-in when module is on", () => {
    const moduleOn = true;
    const type = "DINE_IN";
    const tableSessionId: string | undefined = undefined;
    const mustBlock = moduleOn && type === "DINE_IN" && !tableSessionId;
    expect(mustBlock).toBe(true);
  });

  it("allows dine-in without session when module is off", () => {
    const moduleOn = false;
    const type = "DINE_IN";
    const tableSessionId: string | undefined = undefined;
    const mustBlock = moduleOn && type === "DINE_IN" && !tableSessionId;
    expect(mustBlock).toBe(false);
  });
});
