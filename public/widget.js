(function () {
  var DEFAULT_BRAND_COLOR = "#0f4c81";
  var DEFAULT_MOUNT_ID = "olabits-widget-root";
  var SCRIPT_SELECTOR = 'script[src*="/widget.js"]';

  function normalizeApiBase(value) {
    return value.replace(/\/+$/, "");
  }

  function messageId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function toUIMessage(role, text) {
    return {
      id: messageId(),
      role: role,
      parts: [{ type: "text", text: text }],
    };
  }

  function findScriptTag() {
    if (document.currentScript instanceof HTMLScriptElement) {
      return document.currentScript;
    }
    var found = document.querySelector(SCRIPT_SELECTOR);
    return found instanceof HTMLScriptElement ? found : null;
  }

  function resolvePublicKey(script) {
    var fromScript = script && script.getAttribute("data-public-key");
    var globalConfig = window.OlabitsWidgetConfig || {};
    var fromGlobal = globalConfig.publicKey;
    var legacyGlobalConfig = window.RealEstateBotConfig || {};
    var fromLegacyGlobal = legacyGlobalConfig.publicKey;
    return (fromScript && fromScript.trim()) || (fromGlobal && fromGlobal.trim()) || (fromLegacyGlobal && fromLegacyGlobal.trim()) || "";
  }

  function resolveApiKey(script) {
    var fromScript = script && script.getAttribute("data-api-key");
    var globalConfig = window.OlabitsWidgetConfig || {};
    var fromGlobal = globalConfig.apiKey;
    var legacyGlobalConfig = window.RealEstateBotConfig || {};
    var fromLegacyGlobal = legacyGlobalConfig.apiKey;
    return (fromScript && fromScript.trim()) || (fromGlobal && fromGlobal.trim()) || (fromLegacyGlobal && fromLegacyGlobal.trim()) || "";
  }

  function resolveApiBase(script) {
    var fromScript = script && script.getAttribute("data-api-base");
    if (fromScript && fromScript.trim()) return normalizeApiBase(fromScript.trim());

    var globalConfig = window.OlabitsWidgetConfig || {};
    var fromGlobal = globalConfig.apiBaseUrl;
    if (fromGlobal && fromGlobal.trim()) return normalizeApiBase(fromGlobal.trim());

    var src = script && script.src ? script.src.trim() : "";
    if (src) {
      try {
        return normalizeApiBase(new URL(src, window.location.href).origin);
      } catch (_error) {
        // Ignore invalid src and fallback to current origin.
      }
    }

    return normalizeApiBase(window.location.origin);
  }

  function resolveMountId() {
    var globalConfig = window.OlabitsWidgetConfig || {};
    return (globalConfig.mountId && globalConfig.mountId.trim()) || DEFAULT_MOUNT_ID;
  }

  async function fetchWidgetConfig(apiBase, publicKey) {
    var params = new URLSearchParams({ key: publicKey });
    var response = await fetch(apiBase + "/api/widget/config?" + params.toString(), {
      method: "GET",
      mode: "cors",
      headers: { Accept: "application/json" },
    });

    var payload = await response.json();
    if (!response.ok) {
      throw new Error(
        payload && typeof payload.error === "string"
          ? payload.error
          : "Widget initialization failed."
      );
    }
    return payload;
  }

  async function fetchWidgetConfigWithApiKey(apiBase, apiKey) {
    var params = new URLSearchParams({ apiKey: apiKey });
    var response = await fetch(apiBase + "/api/widget/config?" + params.toString(), {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "application/json",
        "x-company-api-key": apiKey,
      },
    });

    var payload = await response.json();
    if (!response.ok) {
      throw new Error(
        payload && typeof payload.error === "string"
          ? payload.error
          : "Widget initialization failed."
      );
    }
    return payload;
  }

  function injectWidgetStyles(shadow, brandColor) {
    var style = document.createElement("style");
    style.textContent =
      ".oeb-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;border:none;border-radius:9999px;width:56px;height:56px;background:" +
      brandColor +
      ";color:#fff;font-size:24px;cursor:pointer;box-shadow:0 10px 24px rgba(15,76,129,.35)}" +
      ".oeb-panel{position:fixed;right:20px;bottom:88px;z-index:2147483000;width:360px;max-width:calc(100vw - 24px);height:540px;max-height:72vh;background:#fff;border:1px solid #dbe3ef;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;font-family:Inter,Segoe UI,Arial,sans-serif;box-shadow:0 24px 48px rgba(15,23,42,.24)}" +
      ".oeb-hidden{display:none!important}" +
      ".oeb-header{background:" +
      brandColor +
      ";color:#fff;padding:12px 14px;font-weight:600;font-size:14px}" +
      ".oeb-log{flex:1;overflow:auto;padding:12px;background:linear-gradient(to bottom,#f8fbff,#eef5fb)}" +
      ".oeb-row{margin:8px 0;display:flex}" +
      ".oeb-row.user{justify-content:flex-end}" +
      ".oeb-bubble{max-width:82%;padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.4}" +
      ".oeb-row.bot .oeb-bubble{background:#fff;border:1px solid #e5edf6;color:#0f172a}" +
      ".oeb-row.user .oeb-bubble{background:" +
      brandColor +
      ";color:#fff}" +
      ".oeb-form{border-top:1px solid #e2e8f0;padding:10px;display:flex;gap:8px;background:#fff}" +
      ".oeb-input{flex:1;border:1px solid #d1d9e6;border-radius:12px;padding:10px;font-size:13px;outline:none}" +
      ".oeb-send{border:none;border-radius:12px;padding:0 14px;background:" +
      brandColor +
      ";color:#fff;font-weight:600;cursor:pointer}" +
      ".oeb-send:disabled{opacity:.6;cursor:not-allowed}";
    shadow.appendChild(style);
  }

  async function streamAssistantReply(response, bubble, log) {
    if (!response.body) throw new Error("No stream body received.");

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    var fullText = "";

    while (true) {
      var result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      var lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (var i = 0; i < lines.length; i += 1) {
        var line = lines[i].trim();
        if (!line.startsWith("data:")) continue;
        var payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          var event = JSON.parse(payload);
          if (event.type === "text-delta") {
            fullText += String(event.delta || "");
            bubble.textContent = fullText || "...";
            log.scrollTop = log.scrollHeight;
          }
        } catch (_error) {
          // Ignore malformed stream chunks.
        }
      }
    }

    return fullText || bubble.textContent || "";
  }

  function ensureShadowRoot(mountId) {
    var existingHost = document.getElementById(mountId);
    if (existingHost && existingHost.shadowRoot) {
      return existingHost.shadowRoot;
    }

    var host = existingHost || document.createElement("div");
    host.id = mountId;
    if (!existingHost) {
      document.body.appendChild(host);
    }
    return host.attachShadow({ mode: "open" });
  }

  function renderBootErrorWidget(message) {
    var shadow = ensureShadowRoot(resolveMountId());
    if (shadow.querySelector(".oeb-launcher")) return;

    injectWidgetStyles(shadow, DEFAULT_BRAND_COLOR);

    var panel = document.createElement("section");
    panel.className = "oeb-panel";
    var header = document.createElement("div");
    header.className = "oeb-header";
    header.textContent = "Olabits Estate Bot";
    var log = document.createElement("div");
    log.className = "oeb-log";
    var row = document.createElement("div");
    row.className = "oeb-row bot";
    var bubble = document.createElement("div");
    bubble.className = "oeb-bubble";
    bubble.textContent = message;
    row.appendChild(bubble);
    log.appendChild(row);
    panel.appendChild(header);
    panel.appendChild(log);

    var launcher = document.createElement("button");
    launcher.className = "oeb-launcher";
    launcher.setAttribute("aria-label", "Open Olabits chat");
    launcher.textContent = "💬";

    launcher.addEventListener("click", function () {
      panel.classList.toggle("oeb-hidden");
    });

    shadow.appendChild(panel);
    shadow.appendChild(launcher);
  }

  async function bootWidget(apiBase, auth, config) {
    var shadow = ensureShadowRoot(resolveMountId());
    if (shadow.querySelector(".oeb-launcher")) return;

    var brandColor = config.brandColor || DEFAULT_BRAND_COLOR;
    injectWidgetStyles(shadow, brandColor);

    var panel = document.createElement("section");
    panel.className = "oeb-panel oeb-hidden";
    panel.innerHTML =
      '<div class="oeb-header">' +
      config.companyName +
      '</div><div class="oeb-log"></div><form class="oeb-form"><input class="oeb-input" type="text" placeholder="Ask about price, location, or listings..." /><button class="oeb-send" type="submit">Send</button></form>';

    var launcher = document.createElement("button");
    launcher.className = "oeb-launcher";
    launcher.setAttribute("aria-label", "Open Olabits chat");
    launcher.textContent = "💬";

    var log = panel.querySelector(".oeb-log");
    var form = panel.querySelector(".oeb-form");
    var input = panel.querySelector(".oeb-input");
    var sendButton = panel.querySelector(".oeb-send");

    if (!(log instanceof HTMLDivElement) || !(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement) || !(sendButton instanceof HTMLButtonElement)) {
      throw new Error("Widget render failed.");
    }

    var messages = [];

    function appendMessage(role, text) {
      var row = document.createElement("div");
      row.className = "oeb-row " + (role === "user" ? "user" : "bot");
      var bubble = document.createElement("div");
      bubble.className = "oeb-bubble";
      bubble.textContent = text;
      row.appendChild(bubble);
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return bubble;
    }

    appendMessage("bot", "Hello. I can help you with real estate questions.");

    async function sendChatMessage(text) {
      var trimmed = text.trim();
      if (!trimmed) return;

      appendMessage("user", trimmed);
      messages.push(toUIMessage("user", trimmed));
      input.value = "";
      sendButton.disabled = true;

      var assistantBubble = appendMessage("bot", "...");
      try {
        var response = await fetch(apiBase + config.chatEndpoint, {
          method: "POST",
          mode: "cors",
          headers: Object.assign(
            { "Content-Type": "application/json" },
            auth.publicKey ? { "x-company-public-key": auth.publicKey } : {},
            auth.apiKey ? { "x-company-api-key": auth.apiKey } : {}
          ),
          body: JSON.stringify({ messages: messages }),
        });

        if (!response.ok) {
          var contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            var payload = await response.json();
            throw new Error(payload.error || "Request rejected by server.");
          }
          throw new Error("Request rejected by server.");
        }

        var assistantText = await streamAssistantReply(response, assistantBubble, log);
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
        sendButton.disabled = false;
      }
    }

    launcher.addEventListener("click", function () {
      panel.classList.toggle("oeb-hidden");
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      void sendChatMessage(input.value);
    });

    shadow.appendChild(panel);
    shadow.appendChild(launcher);
  }

  async function initializeWidget() {
    var script = findScriptTag();
    var publicKey = resolvePublicKey(script);
    var apiKey = resolveApiKey(script);
    if (!publicKey && !apiKey) {
      console.error("[Olabits Widget] Missing public key.");
      renderBootErrorWidget("Widget setup error: missing widget key.");
      return;
    }

    var apiBase = resolveApiBase(script);
    try {
      var config = publicKey
        ? await fetchWidgetConfig(apiBase, publicKey)
        : await fetchWidgetConfigWithApiKey(apiBase, apiKey);
      await bootWidget(
        apiBase,
        Object.assign(
          {},
          publicKey ? { publicKey: publicKey } : {},
          apiKey ? { apiKey: apiKey } : {}
        ),
        config
      );
    } catch (error) {
      console.error("[Olabits Widget] Boot failed:", error);
      renderBootErrorWidget(
        error instanceof Error && error.message
          ? error.message
          : "Widget failed to initialize."
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      void initializeWidget();
    });
  } else {
    void initializeWidget();
  }
})();
