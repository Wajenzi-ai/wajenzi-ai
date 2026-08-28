const targets = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = targets.find((item) => item.type === "page" && item.url.includes("3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer"));
if (!target?.webSocketDebuggerUrl) throw new Error("Preview browser target was not found.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
const request = (method, params) => new Promise((resolve, reject) => {
  const id = 1;
  socket.addEventListener("message", ({ data }) => { const message = JSON.parse(data); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }, { once: true });
  socket.send(JSON.stringify({ id, method, params }));
});
await request("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
console.log("Preview browser emulation set to 390x844 mobile viewport.");
socket.close();
