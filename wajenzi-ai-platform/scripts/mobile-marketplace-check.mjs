import { writeFileSync } from "node:fs";

const rootUrl = "https://3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer";
const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((item) => item.type === "page" && item.url.includes("3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer")) ?? targets.find((item) => item.type === "page");

if (!target?.webSocketDebuggerUrl) throw new Error("No browser page with a DevTools endpoint is available.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id;
  pending.set(requestId, { resolve, reject });
  socket.send(JSON.stringify({ id: requestId, method, params }));
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const navigate = async (path) => {
  await send("Page.navigate", { url: `${rootUrl}${path}` });
  await sleep(900);
};

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await navigate("/marketplace");
await evaluate(`localStorage.removeItem("wajenzi-marketplace-shortlist-v2")`);
await navigate("/marketplace");

await evaluate(`document.querySelector("button[aria-label='Toggle marketplace menu']")?.click()`);
await sleep(120);
const menuVisible = await evaluate(`document.body.innerText.includes("Shortlist") && document.body.innerText.includes("Manage catalog")`);
await evaluate(`document.querySelector("button[aria-label='Toggle marketplace menu']")?.click()`);
await sleep(120);

const savedTitles = await evaluate(`Array.from(document.querySelectorAll("button[aria-label*='to shortlist']")).slice(0, 2).map((button) => button.getAttribute("aria-label").replace(/^Save /, "").replace(/ to shortlist$/, ""))`);
await evaluate(`Array.from(document.querySelectorAll("button[aria-label*='to shortlist']")).slice(0, 2).forEach((button) => button.click())`);
await sleep(360);
const searchCenter = await evaluate(`(() => { const rect = document.querySelector("input[placeholder*='Search cement']")?.getBoundingClientRect(); return rect ? [rect.left + rect.width / 2, rect.top + rect.height / 2] : null; })()`);
await send("Page.bringToFront");
await send("Input.dispatchMouseEvent", { type: "mousePressed", x: searchCenter[0], y: searchCenter[1], button: "left", clickCount: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: searchCenter[0], y: searchCenter[1], button: "left", clickCount: 1 });
await send("Input.insertText", { text: "steel" });
await sleep(700);
const searchChanged = await evaluate(`document.querySelector("input[placeholder*='Search cement']")?.value === "steel"`);
await evaluate(`document.querySelector("button[aria-label='Open product shortlist']")?.click()`);
await sleep(360);
const shortlistVisible = await evaluate(`document.body.innerText.includes("Your shortlist") && document.body.innerText.includes("Source with AI")`);
const persistenceAcrossSearch = await evaluate(`(${JSON.stringify(savedTitles)}).every((title) => document.body.innerText.includes(title))`);
const comparisonControlVisible = await evaluate(`Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.includes("Compare shortlisted products"))`);
await evaluate(`Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Compare shortlisted products"))?.click()`);
await sleep(360);
const comparisonScreenshot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("/home/ubuntu/mobile-marketplace-comparison.png", Buffer.from(comparisonScreenshot.data, "base64"));
const comparisonVisible = await evaluate(`Boolean(document.querySelector("[role='dialog'][aria-label='Compare shortlisted products']"))`);
await evaluate(`Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Source with AI"))?.click()`);
await sleep(700);
const agentHandoff = await evaluate(`location.pathname === "/app/agent" && Array.from(document.querySelectorAll("textarea")).some((field) => field.value.includes("Marketplace comparison shortlist"))`);

const checks = {};
for (const [label, path, phrase] of [
  ["onboarding", "/app/onboarding", "1. Verify suppliers"],
  ["escrow", "/app/escrow", "2. Protect payment"],
  ["logistics", "/app/logistics", "3. Coordinate delivery"],
]) {
  await navigate("/marketplace");
  await evaluate(`Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes(${JSON.stringify(phrase)}))?.click()`);
  await sleep(500);
  checks[label] = await evaluate(`location.pathname === ${JSON.stringify(path)}`);
}

console.log(JSON.stringify({ viewport: await evaluate("[innerWidth, innerHeight]"), menuVisible, searchChanged, shortlistVisible, persistenceAcrossSearch, comparisonControlVisible, comparisonVisible, agentHandoff, checks }, null, 2));
socket.close();
