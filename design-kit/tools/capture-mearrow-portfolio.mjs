#!/usr/bin/env node

import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const chromeBinary = process.env.CHROME_BIN || findChrome();
const outputRoot = path.join(root, "screenshots/deliverables/portfolio");
const requestedSurface = process.argv[2] || "all";
if (!["all", "web"].includes(requestedSurface)) {
  throw new Error("Use all or web as the export surface.");
}
const products = [
  { slug: "mearrow-sns", name: "MEARROW SNS", webScreens: ["feed", "vote", "profile"] },
  { slug: "mearrow-studio", name: "MEARROW Studio", webScreens: ["home", "fan-vote", "auditions"] },
];
const targets = [];

for (const product of products) {
  const webBase = "/deliverables/portfolio/web/" + product.slug;
  targets.push(
    { name: product.name + " web thumbnail", path: webBase + "/main-thumbnail.html", selector: ".portfolio-canvas", output: "web/" + product.slug + "-main-thumbnail.png", viewport: { width: 1200, height: 1200 }, expected: { width: 1200, height: 1200 } },
    { name: product.name + " web detail", path: webBase + "/detail-page.html", selector: ".portfolio-canvas", output: "web/" + product.slug + "-detail-page.png", viewport: { width: 1200, height: 2100 }, expected: { width: 1200, height: 2100 } },
  );
  for (const screen of product.webScreens) {
    targets.push({ name: product.name + " web " + screen, path: webBase + "/pages.html#page-" + screen, selector: "#page-" + screen, output: "web/" + product.slug + "-page-" + screen + ".png", viewport: { width: 1200, height: 867 }, expected: { width: 1200, height: 867 } });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const staticServer = await startStaticServer();
  const chrome = await startChrome();
  const cdp = await connectBrowser(chrome.webSocketUrl);

  try {
    for (const target of targets) {
      await captureTarget(cdp, staticServer.origin, target);
    }
  } finally {
    await cdp.close().catch(() => {});
    if (chrome.process.exitCode === null) chrome.process.kill("SIGTERM");
    try {
      await waitForProcessExit(chrome.process, 5000);
    } catch {
      if (chrome.process.exitCode === null) chrome.process.kill("SIGKILL");
      await waitForProcessExit(chrome.process, 5000).catch(() => {});
    }
    await rm(chrome.userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
    await new Promise((resolve) => staticServer.server.close(resolve));
  }
}

async function captureTarget(browser, origin, target) {
  const url = `${origin}${target.path}`;
  const page = await browser.createPage(url);
  const pageIssues = [];

  try {
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Log.enable");
    await page.send("Network.enable");
    page.on("Runtime.exceptionThrown", (params) => {
      pageIssues.push(params.exceptionDetails?.text || "runtime exception");
    });
    page.on("Runtime.consoleAPICalled", (params) => {
      if (params.type === "error") pageIssues.push(`console.error in ${target.name}`);
    });
    page.on("Log.entryAdded", (params) => {
      if (params.entry?.level === "error") pageIssues.push(params.entry.text);
    });
    page.on("Network.responseReceived", (params) => {
      if (params.response.status >= 400) {
        pageIssues.push(`HTTP ${params.response.status} ${params.response.url}`);
      }
    });
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: target.viewport.width,
      height: target.viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: target.viewport.width,
      screenHeight: target.viewport.height,
    });
    const loadPromise = waitForLoad(page);
    await page.send("Page.navigate", { url });
    await loadPromise;
    await waitForStableIframes(page);
    await hideCaptureUi(page);
    await assertLiveIframes(page, target.name);
    if (pageIssues.length) {
      throw new Error(`${target.name} browser issue: ${pageIssues.join(" | ")}`);
    }

    const rect = await getClipRect(page, target.selector);
    const screenshot = await page.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: true,
      clip: rect,
    });
    const buffer = Buffer.from(screenshot.data, "base64");
    const outputPath = path.join(outputRoot, target.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buffer);

    const actual = readPngSize(buffer);
    assertExpectedSize(target, actual);
    console.log(`${target.output}: ${actual.width}x${actual.height}`);
  } finally {
    await page.close().catch(() => {});
  }
}

function assertExpectedSize(target, actual) {
  if (target.expected.width && actual.width !== target.expected.width) {
    throw new Error(`${target.output} width ${actual.width} != ${target.expected.width}`);
  }
  if (target.expected.height && actual.height !== target.expected.height) {
    throw new Error(`${target.output} height ${actual.height} != ${target.expected.height}`);
  }
}

async function waitForLoad(page) {
  await page.waitForEvent("Page.loadEventFired", 30000);
}

async function waitForStableIframes(page) {
  const expression = `new Promise(async (resolve) => {
    const delay = (ms) => new Promise((done) => setTimeout(done, ms));
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready.catch(() => {});
    }
    const frames = Array.from(document.querySelectorAll("iframe"));
    await Promise.all(frames.map((frame) => new Promise((done) => {
      try {
        const doc = frame.contentDocument;
        if (doc && doc.readyState === "complete") {
          done();
          return;
        }
      } catch (error) {
        done();
        return;
      }
      frame.addEventListener("load", () => done(), { once: true });
      setTimeout(done, 8000);
    })));
    await delay(120);
    window.dispatchEvent(new Event("resize"));
    await delay(120);
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  })`;
  await page.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function hideCaptureUi(page) {
  await page.send("Runtime.evaluate", {
    expression: `document.querySelectorAll(".asset-actions").forEach((element) => {
      element.style.display = "none";
    })`,
    returnByValue: true,
  });
}

async function assertLiveIframes(page, targetName) {
  const { result } = await page.send("Runtime.evaluate", {
    expression: `(() => Array.from(document.querySelectorAll("iframe")).map((frame) => {
      if (!frame.getClientRects().length) return { title: frame.title, hidden: true };
      try {
        const doc = frame.contentDocument;
        const body = doc && doc.body;
        return {
          title: frame.title,
          readyState: doc && doc.readyState,
          textLength: body ? body.innerText.trim().length : 0,
          height: body ? body.scrollHeight : 0,
          width: body ? body.scrollWidth : 0
        };
      } catch (error) {
        return { title: frame.title, crossOrigin: true };
      }
    }))()`,
    returnByValue: true,
  });
  const frames = result.value || [];
  const blank = frames.filter((frame) => !frame.hidden && !frame.crossOrigin && (frame.readyState !== "complete" || frame.textLength < 10 || frame.height < 100 || frame.width < 100));
  if (blank.length) {
    throw new Error(`${targetName} has blank iframe(s): ${blank.map((frame) => frame.title || "untitled").join(", ")}`);
  }
}

async function getClipRect(page, selector) {
  const { result } = await page.send("Runtime.evaluate", {
    expression: `(async () => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error("missing capture selector: ${selector}");
      const initial = el.getBoundingClientRect();
      window.scrollTo({
        left: Math.max(0, initial.left + window.scrollX),
        top: Math.max(0, initial.top + window.scrollY),
        behavior: "instant"
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.round(rect.left)),
        y: Math.max(0, Math.round(rect.top)),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scale: 1
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  if (!result.value?.width || !result.value?.height) {
    throw new Error(`invalid capture rect for ${selector}`);
  }
  return result.value;
}

function readPngSize(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("capture did not return a PNG");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname);
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end("Method not allowed");
      return;
    }
    if (requested === "/favicon.ico") {
      const favicon = await readFile(path.join(root, "assets/brand/mearrow-mark.svg"));
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "image/svg+xml",
      });
      if (request.method === "HEAD") response.end();
      else response.end(favicon);
      return;
    }
    const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
    let filePath = path.join(root, safePath);

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    if (!path.extname(filePath)) filePath = path.join(filePath, "index.html");
    try {
      const body = await readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": getContentType(filePath),
      });
      if (request.method === "HEAD") response.end();
      else response.end(body);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(`Not found: ${requested}`);
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, origin: `http://127.0.0.1:${port}` };
}

async function startChrome() {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "plodikit-cdp-"));
  const port = await getFreePort();
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--headless=new",
    "--disable-background-networking",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-extensions",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ];
  const child = spawn(chromeBinary, args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const versionUrl = `http://127.0.0.1:${port}/json/version`;
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (child.exitCode !== null) {
      throw new Error(`Chrome exited early: ${stderr}`);
    }
    try {
      const version = await fetchJson(versionUrl);
      return { process: child, userDataDir, webSocketUrl: version.webSocketDebuggerUrl };
    } catch {
      await delay(100);
    }
  }
  child.kill("SIGTERM");
  throw new Error(`Chrome did not expose DevTools in time: ${stderr}`);
}

async function connectBrowser(webSocketUrl) {
  const browser = await CdpConnection.connect(webSocketUrl);
  return {
    async createPage(url) {
      const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await browser.send("Target.attachToTarget", {
        targetId,
        flatten: true,
      });
      return {
        send(method, params) {
          return browser.send(method, params, sessionId);
        },
        waitForEvent(method, timeout) {
          return browser.waitForEvent(method, timeout, sessionId);
        },
        on(method, handler) {
          return browser.on(method, handler, sessionId);
        },
        async close() {
          await browser.send("Target.closeTarget", { targetId });
        },
      };
    },
    close() {
      return browser.close();
    },
  };
}

class CdpConnection {
  static connect(url) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      const connection = new CdpConnection(socket);
      socket.addEventListener("open", () => resolve(connection), { once: true });
      socket.addEventListener("error", () => reject(new Error("CDP websocket failed")), { once: true });
    });
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.waiters = new Map();
    this.listeners = new Map();
    socket.addEventListener("message", (event) => this.handleMessage(event.data));
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    this.socket.send(JSON.stringify(message));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
    });
  }

  waitForEvent(method, timeout = 10000, sessionId = "") {
    const key = `${sessionId}:${method}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeout);
      const entry = { resolve, timer };
      const waiters = this.waiters.get(key) || [];
      waiters.push(entry);
      this.waiters.set(key, waiters);
    });
  }

  on(method, handler, sessionId = "") {
    const key = `${sessionId}:${method}`;
    const listeners = this.listeners.get(key) || [];
    listeners.push(handler);
    this.listeners.set(key, listeners);
    return () => {
      const next = (this.listeners.get(key) || []).filter((item) => item !== handler);
      if (next.length) this.listeners.set(key, next);
      else this.listeners.delete(key);
    };
  }

  handleMessage(data) {
    const message = JSON.parse(data);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
      else pending.resolve(message.result || {});
      return;
    }

    if (message.method) {
      const key = `${message.sessionId || ""}:${message.method}`;
      const listeners = this.listeners.get(key) || [];
      for (const listener of listeners) listener(message.params || {});
      const waiters = this.waiters.get(key);
      if (!waiters?.length) return;
      const waiter = waiters.shift();
      if (!waiters.length) this.waiters.delete(key);
      clearTimeout(waiter.timer);
      waiter.resolve(message.params || {});
    }
  }

  close() {
    this.socket.close();
    return Promise.resolve();
  }
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function findChrome() {
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Chrome binary not found. Set CHROME_BIN=/path/to/chrome.");
  return found;
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
  };
  return types[extension] || "application/octet-stream";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForProcessExit(child, timeout) {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off("exit", handleExit);
      reject(new Error("process exit timeout"));
    }, timeout);
    const handleExit = () => {
      clearTimeout(timer);
      resolve();
    };
    child.once("exit", handleExit);
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}
