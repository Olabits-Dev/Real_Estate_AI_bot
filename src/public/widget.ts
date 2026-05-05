interface OlabitsWidgetGlobalConfig {
  publicKey?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  mountId?: string;
}

interface RealEstateBotLegacyConfig {
  publicKey?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  mountId?: string;
}

interface Window {
  OlabitsWidgetConfig?: OlabitsWidgetGlobalConfig;
  RealEstateBotConfig?: RealEstateBotLegacyConfig;
}

type ChatPart = {
  type: "text";
  text: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: ChatPart[];
};

type WidgetConfigResponse = {
  companyId: string;
  companyName: string;
  plan: "SILVER" | "GOLD" | "PLATINUM" | null;
  isSubscribed: boolean;
  chatEndpoint: string;
  brandColor?: string;
};

const DEFAULT_BRAND_COLOR = "#0f4c81";
const DEFAULT_MOUNT_ID = "olabits-widget-root";
const SCRIPT_SELECTOR = 'script[src*="/widget.js"]';

function normalizeApiBase(value: string) {
  return value.replace(/\/+$/, "");
}

function messageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toUIMessage(role: "user" | "assistant", text: string): ChatMessage {
  return {
    id: messageId(),
    role,
    parts: [{ type: "text", text }],
  };
}

function findScriptTag() {
  if (document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }
  const found = document.querySelector(SCRIPT_SELECTOR);
  return found instanceof HTMLScriptElement ? found : null;
}

function resolvePublicKey(script: HTMLScriptElement | null) {
  const fromScript = script?.getAttribute("data-public-key")?.trim();
  const fromGlobal = window.OlabitsWidgetConfig?.publicKey?.trim();
  const fromLegacyGlobal = window.RealEstateBotConfig?.publicKey?.trim();
  return fromScript || fromGlobal || fromLegacyGlobal || "";
}

function resolveApiKey(script: HTMLScriptElement | null) {
  const fromScript = script?.getAttribute("data-api-key")?.trim();
  const fromGlobal = window.OlabitsWidgetConfig?.apiKey?.trim();
  const fromLegacyGlobal = window.RealEstateBotConfig?.apiKey?.trim();
  return fromScript || fromGlobal || fromLegacyGlobal || "";
}

function resolveApiBase(script: HTMLScriptElement | null) {
  const fromGlobal = window.OlabitsWidgetConfig?.apiBaseUrl?.trim();
  if (fromGlobal) return normalizeApiBase(fromGlobal);

  const src = script?.src?.trim();
  if (src) {
    try {
      return normalizeApiBase(new URL(src, window.location.href).origin);
    } catch {
      // Ignore invalid src and fallback to current origin.
    }
  }

  return normalizeApiBase(window.location.origin);
}

function resolveMountId() {
  return window.OlabitsWidgetConfig?.mountId?.trim() || DEFAULT_MOUNT_ID;
}

async function fetchWidgetConfig(apiBase: string, publicKey: string) {
  const params = new URLSearchParams({ key: publicKey });
  const response = await fetch(`${apiBase}/api/widget/config?${params.toString()}`, {
    method: "GET",
    mode: "cors",
    headers: { Accept: "application/json" },
  });

  const payload = (await response.json()) as
    | WidgetConfigResponse
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" && payload && "error" in payload
        ? payload.error || "Widget initialization failed."
        : "Widget initialization failed.",
    );
  }

  return payload as WidgetConfigResponse;
}

async function fetchWidgetConfigWithApiKey(apiBase: string, apiKey: string) {
  const params = new URLSearchParams({ apiKey });
  const response = await fetch(`${apiBase}/api/widget/config?${params.toString()}`, {
    method: "GET",
    mode: "cors",
    headers: {
      Accept: "application/json",
      "x-company-api-key": apiKey,
    },
  });

  const payload = (await response.json()) as
    | WidgetConfigResponse
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      typeof payload === "object" && payload && "error" in payload
        ? payload.error || "Widget initialization failed."
        : "Widget initialization failed.",
    );
  }

  return payload as WidgetConfigResponse;
}

function injectWidgetStyles(shadow: ShadowRoot, brandColor: string) {
  const style = document.createElement("style");
  style.textContent = `
    .oeb-launcher{
      position:fixed;right:20px;bottom:20px;z-index:2147483000;border:none;border-radius:9999px;
      width:56px;height:56px;background:${brandColor};color:#fff;font-size:24px;cursor:pointer;
      box-shadow:0 10px 24px rgba(15,76,129,.35)
    }
    .oeb-panel{
      position:fixed;right:20px;bottom:88px;z-index:2147483000;width:360px;max-width:calc(100vw - 24px);
      height:540px;max-height:72vh;background:#fff;border:1px solid #dbe3ef;border-radius:20px;overflow:hidden;
      display:flex;flex-direction:column;font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 24px 48px rgba(15,23,42,.24)
    }
    .oeb-hidden{display:none!important}
    .oeb-header{background:${brandColor};color:#fff;padding:12px 14px;font-weight:600;font-size:14px}
    .oeb-log{flex:1;overflow:auto;padding:12px;background:linear-gradient(to bottom,#f8fbff,#eef5fb)}
    .oeb-row{margin:8px 0;display:flex}
    .oeb-row.user{justify-content:flex-end}
    .oeb-bubble{max-width:82%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4}
    .oeb-row.bot .oeb-bubble{background:#fff;border:1px solid #e5edf6;color:#0f172a}
    .oeb-row.user .oeb-bubble{background:${brandColor};color:#fff}
    .oeb-form{border-top:1px solid #e2e8f0;padding:10px;display:flex;gap:8px;background:#fff}
    .oeb-input{flex:1;border:1px solid #d1d9e6;border-radius:12px;padding:10px;font-size:13px;outline:none}
    .oeb-send{border:none;border-radius:12px;padding:0 14px;background:${brandColor};color:#fff;font-weight:600;cursor:pointer}
    .oeb-send:disabled{opacity:.6;cursor:not-allowed}
  `;
  shadow.appendChild(style);
}

async function streamAssistantReply(response: Response, bubble: HTMLDivElement, log: HTMLDivElement) {
  if (!response.body) throw new Error("No stream body received.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const event = JSON.parse(payload) as { type?: string; delta?: unknown };
        if (event.type === "text-delta") {
          fullText += String(event.delta ?? "");
          bubble.textContent = fullText || "...";
          log.scrollTop = log.scrollHeight;
        }
      } catch {
        // Ignore malformed stream chunks.
      }
    }
  }

  return fullText || bubble.textContent || "";
}

function ensureShadowRoot(mountId: string) {
  const existingHost = document.getElementById(mountId);
  if (existingHost && existingHost.shadowRoot) {
    return existingHost.shadowRoot;
  }

  const host = existingHost ?? document.createElement("div");
  host.id = mountId;
  if (!existingHost) {
    document.body.appendChild(host);
  }

  return host.attachShadow({ mode: "open" });
}

function renderBootErrorWidget(message: string) {
  const shadow = ensureShadowRoot(resolveMountId());
  if (shadow.querySelector(".oeb-launcher")) return;

  injectWidgetStyles(shadow, DEFAULT_BRAND_COLOR);

  const panel = document.createElement("section");
  panel.className = "oeb-panel";
  const header = document.createElement("div");
  header.className = "oeb-header";
  header.textContent = "Olabits Estate Bot";
  const log = document.createElement("div");
  log.className = "oeb-log";
  const row = document.createElement("div");
  row.className = "oeb-row bot";
  const bubble = document.createElement("div");
  bubble.className = "oeb-bubble";
  bubble.textContent = message;
  row.appendChild(bubble);
  log.appendChild(row);
  panel.appendChild(header);
  panel.appendChild(log);

  const launcher = document.createElement("button");
  launcher.className = "oeb-launcher";
  launcher.setAttribute("aria-label", "Open Olabits chat");
  launcher.textContent = "💬";

  launcher.addEventListener("click", () => {
    panel.classList.toggle("oeb-hidden");
  });

  shadow.appendChild(panel);
  shadow.appendChild(launcher);
}

async function bootWidget(
  apiBase: string,
  auth: { publicKey?: string; apiKey?: string },
  config: WidgetConfigResponse,
) {
  const shadow = ensureShadowRoot(resolveMountId());
  if (shadow.querySelector(".oeb-launcher")) {
    return;
  }

  const brandColor = config.brandColor || DEFAULT_BRAND_COLOR;
  injectWidgetStyles(shadow, brandColor);

  const panel = document.createElement("section");
  panel.className = "oeb-panel oeb-hidden";
  panel.innerHTML = `
    <div class="oeb-header">${config.companyName}</div>
    <div class="oeb-log"></div>
    <form class="oeb-form">
      <input class="oeb-input" type="text" placeholder="Ask about price, location, or listings..." />
      <button class="oeb-send" type="submit">Send</button>
    </form>
  `;

  const launcher = document.createElement("button");
  launcher.className = "oeb-launcher";
  launcher.setAttribute("aria-label", "Open Olabits chat");
  launcher.textContent = "💬";

  const log = panel.querySelector(".oeb-log");
  const form = panel.querySelector(".oeb-form");
  const input = panel.querySelector(".oeb-input");
  const sendButton = panel.querySelector(".oeb-send");

  if (
    !(log instanceof HTMLDivElement) ||
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLInputElement) ||
    !(sendButton instanceof HTMLButtonElement)
  ) {
    throw new Error("Widget render failed.");
  }

  const logEl = log;
  const formEl = form;
  const inputEl = input;
  const sendButtonEl = sendButton;
  const messages: ChatMessage[] = [];

  function appendMessage(role: "user" | "bot", text: string) {
    const row = document.createElement("div");
    row.className = `oeb-row ${role === "user" ? "user" : "bot"}`;
    const bubble = document.createElement("div");
    bubble.className = "oeb-bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
    return bubble;
  }

  appendMessage("bot", "Hello. I can help you with real estate questions.");

  async function sendChatMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    appendMessage("user", trimmed);
    messages.push(toUIMessage("user", trimmed));
    inputEl.value = "";
    sendButtonEl.disabled = true;

    const assistantBubble = appendMessage("bot", "...");
    try {
      const response = await fetch(`${apiBase}${config.chatEndpoint}`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          ...(auth.publicKey ? { "x-company-public-key": auth.publicKey } : {}),
          ...(auth.apiKey ? { "x-company-api-key": auth.apiKey } : {}),
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || "Request rejected by server.");
        }
        throw new Error("Request rejected by server.");
      }

      const assistantText = await streamAssistantReply(response, assistantBubble, logEl);
      assistantBubble.textContent =
        assistantText || "I could not process that request. Please try again.";
      messages.push(toUIMessage("assistant", assistantBubble.textContent));
    } catch (error) {
      console.error("[Olabits Widget] Chat request failed:", error);
      assistantBubble.textContent =
        error instanceof Error && error.message
          ? error.message
          : "Service is temporarily unavailable. Please try again shortly.";
      messages.push(toUIMessage("assistant", assistantBubble.textContent));
    } finally {
      sendButtonEl.disabled = false;
    }
  }

  launcher.addEventListener("click", () => {
    panel.classList.toggle("oeb-hidden");
  });

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    void sendChatMessage(inputEl.value);
  });

  shadow.appendChild(panel);
  shadow.appendChild(launcher);
}

async function initializeWidget() {
  const script = findScriptTag();
  const publicKey = resolvePublicKey(script);
  const apiKey = resolveApiKey(script);
  if (!publicKey && !apiKey) {
    console.error("[Olabits Widget] Missing public key.");
    renderBootErrorWidget("Widget setup error: missing widget key.");
    return;
  }

  const apiBase = resolveApiBase(script);

  try {
    const config = publicKey
      ? await fetchWidgetConfig(apiBase, publicKey)
      : await fetchWidgetConfigWithApiKey(apiBase, apiKey);
    await bootWidget(
      apiBase,
      { ...(publicKey ? { publicKey } : {}), ...(apiKey ? { apiKey } : {}) },
      config,
    );
  } catch (error) {
    console.error("[Olabits Widget] Boot failed:", error);
    renderBootErrorWidget(
      error instanceof Error && error.message
        ? error.message
        : "Widget failed to initialize.",
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void initializeWidget();
  });
} else {
  void initializeWidget();
}
