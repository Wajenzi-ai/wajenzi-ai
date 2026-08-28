import json
import subprocess
import time
import urllib.parse
import urllib.request

import websocket

BASE_URL = "https://3000-i588w8lhf0p53p9xrxphq-0db9f1b5.us2.manus.computer"
DEBUG_PORT = 9339


def fetch_json(url, method="GET"):
    request = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(request, timeout=5) as response:
        return json.loads(response.read().decode())


def wait_for(condition, message):
    deadline = time.time() + 20
    while time.time() < deadline:
        try:
            value = condition()
        except Exception:
            value = None
        if value:
            return value
        time.sleep(0.2)
    raise AssertionError(message)


chrome = subprocess.Popen([
    "/usr/bin/chromium",
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--remote-allow-origins=*",
    f"--remote-debugging-port={DEBUG_PORT}",
    "--user-data-dir=/tmp/wajenzi-hero-mobile-cdp",
    "about:blank",
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

try:
    wait_for(lambda: fetch_json(f"http://127.0.0.1:{DEBUG_PORT}/json/version"), "Chromium did not start.")
    page = fetch_json(f"http://127.0.0.1:{DEBUG_PORT}/json/new?{urllib.parse.quote(BASE_URL, safe=':/?=&')}", method="PUT")
    socket = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=10)
    request_id = 0

    def cdp(method, params=None):
        global request_id
        request_id += 1
        socket.send(json.dumps({"id": request_id, "method": method, "params": params or {}}))
        while True:
            response = json.loads(socket.recv())
            if response.get("id") == request_id:
                if "error" in response:
                    raise AssertionError(f"CDP {method} failed: {response['error']}")
                return response.get("result", {})

    cdp("Page.enable")
    cdp("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})

    def evaluate(expression):
        result = cdp("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
        return result.get("result", {}).get("value")

    def go_home():
        cdp("Page.navigate", {"url": BASE_URL})
        wait_for(lambda: evaluate("document.readyState === 'complete'"), "Home page did not finish loading.")
        wait_for(lambda: evaluate("Boolean(document.querySelector('#hero-project-prompt'))"), "Hero prompt was not rendered at mobile width.")

    def fill_brief(brief):
        value = json.dumps(brief)
        evaluate("""(() => {
          const input = document.querySelector('#hero-project-prompt');
          const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
          setValue.call(input, %s);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        })()""" % value)
        time.sleep(0.4)

    def click_action(label):
        clicked = evaluate("""(() => {
          const action = [...document.querySelectorAll('button')].find((button) => button.innerText.trim() === %s);
          if (!action) return false;
          action.click();
          return true;
        })()""" % json.dumps(label))
        if not clicked:
            raise AssertionError(f"Mobile action '{label}' was not available.")

    def click_action_containing(fragment):
        clicked = evaluate("""(() => {
          const action = [...document.querySelectorAll('button')].find((button) => button.textContent.includes(%s));
          if (!action) return false;
          action.click();
          return true;
        })()""" % json.dumps(fragment))
        if not clicked:
            raise AssertionError(f"Mobile action containing '{fragment}' was not available.")

    homeowner_brief = "Source concrete and roofing for a Nairobi four-bedroom home."
    go_home()
    fill_brief(homeowner_brief)
    click_action("Start a Project")
    wait_for(lambda: evaluate("location.pathname === '/app/homeowner'"), "Start a Project did not route to Homeowner.")
    wait_for(lambda: evaluate("document.body.innerText.includes(%s)" % json.dumps(homeowner_brief)), "Homeowner did not display the carried project brief.")

    supplier_brief = "Compare verified roofing suppliers for my Nairobi project."
    go_home()
    fill_brief(supplier_brief)
    click_action("Find Suppliers")
    wait_for(lambda: evaluate("location.pathname === '/marketplace'"), "Find Suppliers did not route to Marketplace.")
    wait_for(lambda: evaluate("localStorage.getItem('wajenzi-hero-project-brief') === %s" % json.dumps(supplier_brief)), "Find Suppliers did not persist the supplier brief.")
    wait_for(lambda: evaluate("Boolean([...document.querySelectorAll('p')].find((item) => item.textContent.trim() === 'Project brief ready for sourcing')) && document.body.innerText.includes(%s)" % json.dumps(supplier_brief)), "Marketplace did not display the carried supplier brief.")

    go_home()
    wait_for(lambda: evaluate("Boolean(document.querySelector(\"img[src='/manus-storage/wajenzi-stores-wordmark_ac862ec0.webp']\"))"), "Wajenzi Stores brand asset was not rendered.")
    wait_for(lambda: evaluate("Boolean([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Browse Wajenzi marketplace')))"), "Wajenzi Stores marketplace-source action did not render.")
    click_action_containing("Browse Wajenzi marketplace")
    wait_for(lambda: evaluate("location.pathname === '/marketplace'"), "Wajenzi Stores marketplace-source action did not open the marketplace.")

    go_home()
    wait_for(lambda: evaluate("Boolean([...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'Start Your Project'))"), "Contractor project-start entry point did not render at mobile width.")
    click_action("Start Your Project")
    wait_for(lambda: evaluate("location.pathname === '/app/agent'"), "Contractor take-off action did not open AI Procurement.")
    wait_for(lambda: evaluate("localStorage.getItem('wajenzi-ai-procurement-brief') === 'I need a contractor take-off from my BOQ or architectural plan.'"), "Contractor take-off action did not persist its AI context.")
    wait_for(lambda: evaluate("[...document.querySelectorAll('textarea')].some((item) => item.value === 'I need a contractor take-off from my BOQ or architectural plan.')"), "AI Procurement did not receive the contractor take-off context.")

    go_home()
    wait_for(lambda: evaluate("Boolean([...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'roofing'))"), "Live footer category taxonomy did not load.")
    click_action("roofing")
    wait_for(lambda: evaluate("location.pathname === '/marketplace' && new URLSearchParams(location.search).get('category') === 'roofing'"), "Mobile footer category did not open the filtered marketplace view.")

    go_home()
    wait_for(lambda: evaluate("Boolean([...document.querySelectorAll('button')].find((button) => button.innerText.trim() === 'AI procurement'))"), "Footer AI procurement service link did not load.")
    click_action("AI procurement")
    wait_for(lambda: evaluate("location.pathname === '/app/agent'"), "Mobile footer AI procurement link did not open its workspace.")

    go_home()
    wait_for(lambda: evaluate("[...document.querySelectorAll('button')].filter((button) => button.innerText.trim() === 'Start a Project').length >= 2"), "Final Start a Project CTA did not render alongside the hero control.")
    clicked_final_cta = evaluate("""(() => {
      const actions = [...document.querySelectorAll('button')].filter((button) => button.innerText.trim() === 'Start a Project');
      actions.at(-1).click();
      return true;
    })()""")
    assert clicked_final_cta
    wait_for(lambda: evaluate("location.pathname === '/app/homeowner'"), "Final Start a Project CTA did not open the Homeowner workspace.")

    print("Mobile hero and footer handoffs verified at 390x844.")
    socket.close()
finally:
    chrome.terminate()
    try:
        chrome.wait(timeout=5)
    except subprocess.TimeoutExpired:
        chrome.kill()
