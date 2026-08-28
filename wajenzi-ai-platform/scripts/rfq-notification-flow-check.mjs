const baseUrl = "https://3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer";
const pages = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const page = pages.find((item) => item.type === "page" && item.url.includes("3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer")) ?? pages.find((item) => item.type === "page");
if (!page?.webSocketDebuggerUrl) throw new Error("No preview browser DevTools endpoint is available.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(new Error(message.error.message)) : resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id;
  pending.set(requestId, { resolve, reject });
  socket.send(JSON.stringify({ id: requestId, method, params }));
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const navigate = async (path) => {
  await send("Page.navigate", { url: `${baseUrl}${path}` });
  await sleep(900);
};

await navigate("/app/contractor");
await evaluate(`localStorage.removeItem("wajenzi-simulated-rfq-notifications-v1")`);
await navigate("/app/contractor");
const dispatched = await evaluate(`(() => { const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === "Send RFQ"); button?.click(); return Boolean(button); })()`);
await sleep(500);
const dispatchVisible = await evaluate(`document.body.innerText.includes("Atlas Hardware") && document.body.innerText.includes("Delivered")`);

await navigate("/app/supplier");
const inboxVisible = await evaluate(`document.body.innerText.includes("RFQ notification inbox") && document.body.innerText.includes("Structural concrete") && document.body.innerText.includes("Acknowledge")`);
await evaluate(`Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === "Acknowledge")?.click()`);
await sleep(200);
const acknowledged = await evaluate(`document.body.innerText.includes("Prepare quotation")`);
await evaluate(`Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === "Prepare quotation")?.click()`);
await sleep(200);
const quotationReady = await evaluate(`document.body.innerText.includes("Quotation ready")`);

console.log(JSON.stringify({ dispatched, dispatchVisible, inboxVisible, acknowledged, quotationReady }, null, 2));
socket.close();
