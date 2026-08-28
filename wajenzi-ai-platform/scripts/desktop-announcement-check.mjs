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
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const anchors = [];
  for (const href of ["#platform", "#workflow", "#roles", "#resources"]) {
    await send("Page.navigate", { url: `${preview}/` });
    await sleep(450);
    anchors.push(await evaluate(`(() => { document.querySelector('a[href="${href}"]')?.click(); return { href: '${href}', hash: location.hash, width: window.innerWidth }; })()`));
  }
  const routes = [];
  const conversionControls = [
    ["top-get-started", "Get started", 0],
    ["hero-procurement", "Start a procurement request", 0],
    ["hero-platform", "Explore the platform", 0],
    ["workflow-agent", "Open the procurement agent", 0],
    ["platform-admin", "View platform operations", 0],
    ["homeowner-role", "Homeowners", 0],
    ["contractor-role", "Contractors", 0],
    ["supplier-role", "Suppliers", 0],
    ["delivery-role", "Delivery partners", 0],
    ["final-platform", "Explore the platform", -1],
    ["final-supplier", "Join as a supplier", 0],
    ["footer-agent", "AI procurement", 0],
    ["footer-supplier", "Supplier entry", 0],
  ];
  for (const [key, label, occurrence] of conversionControls) {
    await send("Page.navigate", { url: `${preview}/` });
    await sleep(450);
    routes.push(await evaluate(`(() => { const matches = [...document.querySelectorAll('button')].filter((item) => item.textContent?.trim().startsWith('${label}')); const button = matches[${occurrence} < 0 ? matches.length - 1 : ${occurrence}]; button?.click(); return new Promise((resolve) => setTimeout(() => resolve({ key: '${key}', label: '${label}', path: location.pathname, width: window.innerWidth, found: Boolean(button) }), 250)); })()`));
  }
  console.log(JSON.stringify({ anchors, routes }, null, 2));
} finally {
  await send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
  socket.close();
}
