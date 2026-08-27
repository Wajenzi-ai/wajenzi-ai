import { describe, expect, it } from "vitest";

describe("wajenzi.ai managed branding", () => {
  it("uses the requested application title in the injected environment", () => {
    expect(process.env.VITE_APP_TITLE).toBe("wajenzi.ai");
  });
});
