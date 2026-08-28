const preview = "https://3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer";

const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((item) => item.type === "page" && item.url.includes("3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer"));
if (!target?.webSocketDebuggerUrl) throw new Error("Preview browser target was not found.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
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
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

try {
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send("Page.navigate", { url: `${preview}/` });
  await sleep(800);
  const anchorResult = await evaluate(`(() => {
    const menu = document.querySelector('button[aria-label="Toggle menu"]');
    menu?.click();
    const links = [...document.querySelectorAll('a[href="#workflow"]')];
    links.at(-1)?.click();
    return { width: window.innerWidth, workflowLinks: links.length, hash: location.hash };
  })()`);
  await send("Page.navigate", { url: `${preview}/` });
  await sleep(800);
  const ctaResult = await evaluate(`(() => {
    document.querySelector('button[aria-label="Toggle menu"]')?.click();
    const cta = [...document.querySelectorAll('button')].filter((button) => button.textContent?.trim().startsWith('Get started')).at(-1);
    cta?.click();
    return new Promise((resolve) => setTimeout(() => resolve({ width: window.innerWidth, path: location.pathname }), 350));
  })()`);
  console.log(JSON.stringify({ anchorResult, ctaResult }, null, 2));
} finally {
  await send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
  socket.close();
}
