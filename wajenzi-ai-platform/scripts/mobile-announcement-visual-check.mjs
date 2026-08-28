import { mkdir, writeFile } from "node:fs/promises";

const preview = "https://3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer";
const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((item) => item.type === "page" && item.url.includes("3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer"));
if (!target?.webSocketDebuggerUrl) throw new Error("Preview browser target was not found.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => { const message = JSON.parse(data); if (message.id && pending.has(message.id)) { const waiter = pending.get(message.id); pending.delete(message.id); message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

try {
  await mkdir("/home/ubuntu/wajenzi-ai-platform/docs/validation-assets", { recursive: true });
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send("Page.navigate", { url: `${preview}/` });
  await sleep(900);
  await evaluate(`(() => { document.querySelector('button[aria-label="Toggle menu"]')?.click(); return true; })()`);
  await sleep(180);
  const menuState = await evaluate(`(() => { const panels = [...document.querySelectorAll('div.lg\\:hidden')]; return { width: window.innerWidth, mobileMenuVisible: panels.some((node) => node.textContent?.includes('Get started')), panelCount: panels.length }; })()`);
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile("/home/ubuntu/wajenzi-ai-platform/docs/validation-assets/mobile-menu-open.png", Buffer.from(screenshot.data, "base64"));
  const anchorState = await evaluate(`(() => { const links = [...document.querySelectorAll('a[href="#workflow"]')]; links.at(-1)?.click(); return { hash: location.hash, width: window.innerWidth }; })()`);
  await send("Page.navigate", { url: `${preview}/` });
  await sleep(900);
  const ctaState = await evaluate(`(() => { document.querySelector('button[aria-label="Toggle menu"]')?.click(); const controls = [...document.querySelectorAll('button')].filter((button) => button.textContent?.trim().startsWith('Get started')); controls.at(-1)?.click(); return new Promise((resolve) => setTimeout(() => resolve({ path: location.pathname, width: window.innerWidth }), 350)); })()`);
  console.log(JSON.stringify({ menuState, anchorState, ctaState, screenshot: "/home/ubuntu/wajenzi-ai-platform/docs/validation-assets/mobile-menu-open.png" }, null, 2));
} finally {
  await send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
  socket.close();
}
