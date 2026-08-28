export const HERO_PROJECT_BRIEF_KEY = "wajenzi-hero-project-brief";
export const AI_PROCUREMENT_BRIEF_KEY = "wajenzi-ai-procurement-brief";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readHeroBrief(storage: StorageLike) {
  return storage.getItem(HERO_PROJECT_BRIEF_KEY)?.trim() || "";
}

export function readAiProcurementBrief(storage: StorageLike) {
  return storage.getItem(AI_PROCUREMENT_BRIEF_KEY)?.trim() || "";
}

export function saveHeroBrief(brief: string, storage: StorageLike) {
  const normalized = brief.trim();
  if (!normalized) return "";
  storage.setItem(HERO_PROJECT_BRIEF_KEY, normalized);
  storage.setItem(AI_PROCUREMENT_BRIEF_KEY, normalized);
  return normalized;
}

export function clearHeroBrief(storage: StorageLike) {
  storage.removeItem(HERO_PROJECT_BRIEF_KEY);
  storage.removeItem(AI_PROCUREMENT_BRIEF_KEY);
}
