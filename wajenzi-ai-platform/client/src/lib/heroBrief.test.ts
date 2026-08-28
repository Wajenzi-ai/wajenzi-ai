import { describe, expect, it } from "vitest";
import { AI_PROCUREMENT_BRIEF_KEY, HERO_PROJECT_BRIEF_KEY, clearHeroBrief, readAiProcurementBrief, readHeroBrief, saveHeroBrief } from "./heroBrief";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("hero project brief handoff", () => {
  it("stores one trimmed project brief for both project and AI destination workflows", () => {
    const storage = createStorage();

    expect(saveHeroBrief("  Source roofing suppliers in Nairobi.  ", storage)).toBe("Source roofing suppliers in Nairobi.");
    expect(storage.getItem(HERO_PROJECT_BRIEF_KEY)).toBe("Source roofing suppliers in Nairobi.");
    expect(storage.getItem(AI_PROCUREMENT_BRIEF_KEY)).toBe("Source roofing suppliers in Nairobi.");
    expect(readHeroBrief(storage)).toBe("Source roofing suppliers in Nairobi.");
    expect(readAiProcurementBrief(storage)).toBe("Source roofing suppliers in Nairobi.");
  });

  it("does not replace destination context with an empty brief and can clear it intentionally", () => {
    const storage = createStorage();
    saveHeroBrief("Concrete package", storage);

    expect(saveHeroBrief("   ", storage)).toBe("");
    expect(readHeroBrief(storage)).toBe("Concrete package");
    clearHeroBrief(storage);
    expect(readHeroBrief(storage)).toBe("");
    expect(readAiProcurementBrief(storage)).toBe("");
  });
});
