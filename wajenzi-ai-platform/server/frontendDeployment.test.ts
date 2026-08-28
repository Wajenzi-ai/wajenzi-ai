import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("frontend-only deployment contract", () => {
  it("defines a Vite-only build and preserves API plus SPA routing", () => {
    const root = resolve(import.meta.dirname, "..");
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
    const vercel = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8")) as { buildCommand: string; outputDirectory: string; rewrites: Array<{ source: string; destination: string }> };

    expect(packageJson.scripts["build:frontend"]).toBe("vite build");
    expect(vercel.buildCommand).toBe("pnpm build:frontend");
    expect(vercel.outputDirectory).toBe("dist/public");
    expect(vercel.rewrites).toContainEqual({ source: "/api/(.*)", destination: "https://wajenziai-fxhv7ppu.manus.space/api/$1" });
    expect(vercel.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
  });
});
