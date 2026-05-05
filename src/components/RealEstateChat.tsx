"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, MessageCircle, Send, User, X } from "lucide-react";
import type { BillingPlanName } from "@/lib/billing-plan";

const AUTO_OPEN_SESSION_KEY = "real-estate-chat-auto-opened";
const DEFAULT_STARTER_PROMPTS = [
  "Show me Lekki deals",
  "Houses under 50M",
  "Invest in land",
] as const;

type RealEstateChatProps = {
  companyId: string;
  companyName?: string;
  brandColor?: string;
  starterPrompts?: string[];
  isSubscribed?: boolean;
  plan?: BillingPlanName | null;
  previewPlan?: BillingPlanName | null;
};

function sanitizeStarterPrompts(prompts?: string[]) {
  if (!prompts?.length) return [];

  const unique = new Set<string>();
  for (const prompt of prompts) {
    const value = prompt.trim();
    if (!value) continue;
    unique.add(value);
    if (unique.size === 3) break;
  }

  return Array.from(unique);
}

function normalizeBrandColor(value?: string) {
  if (!value) return "#0f4c81";
  const color = value.trim();
  const isValid =
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ||
    /^rgb(a)?\(.+\)$/.test(color) ||
    /^hsl(a)?\(.+\)$/.test(color);
  return isValid ? color : "#0f4c81";
}

export default function RealEstateChat({
  companyId,
  companyName = "Olabits Estate bot",
  brandColor,
  starterPrompts: providedStarterPrompts,
  isSubscribed,
  plan,
  previewPlan,
}: RealEstateChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const brand = normalizeBrandColor(brandColor);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      body: {
        companyId,
        ...(previewPlan ? { previewPlan } : {}),
      },
    }),
  });

  useEffect(() => {
    const alreadyOpened = sessionStorage.getItem(
      `${AUTO_OPEN_SESSION_KEY}-${companyId}`,
    );
    if (alreadyOpened) return;

    const timeoutId = window.setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(`${AUTO_OPEN_SESSION_KEY}-${companyId}`, "true");
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [companyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const isSending = status === "submitted" || status === "streaming";
  const hasUserMessage = messages.some((message) => message.role === "user");
  const serviceUnavailable = isSubscribed === false;
  const canUseWhatsappRouting = plan === "GOLD" || plan === "PLATINUM";
  const starterPrompts = useMemo(() => {
    const prompts = sanitizeStarterPrompts(providedStarterPrompts);
    return prompts.length ? prompts : [...DEFAULT_STARTER_PROMPTS];
  }, [providedStarterPrompts]);

  const chatMessages = useMemo(
    () =>
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join(""),
      })),
    [messages],
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-4 bottom-24 z-50 mx-auto h-[70dvh] max-h-[620px] w-auto max-w-md rounded-3xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur xl:inset-x-auto xl:right-6 xl:bottom-24 xl:w-[390px]"
          style={{ "--brand-color": brand } as CSSProperties}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-200/80 bg-[var(--brand-color)] px-4 py-3 text-white">
              <div>
                <p className="text-sm font-semibold">{companyName}</p>
                <p className="text-xs text-white/80">
                  {serviceUnavailable ? "Unavailable" : "Online now"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-white/90 transition hover:bg-white/20"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(to_bottom,_#f8fbff,_#eef5fb)] p-4">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white p-3 text-sm text-slate-700 shadow">
                {serviceUnavailable
                  ? "This service is temporarily unavailable."
                  : `Hello, I'm ${companyName}. What type of home are you looking for?`}
              </div>

              {!serviceUnavailable && !hasUserMessage && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">
                    Quick starters
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={async () => {
                          if (isSending) return;
                          await sendMessage({ text: prompt });
                        }}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-[var(--brand-color)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSending}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!serviceUnavailable && canUseWhatsappRouting && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (isSending) return;
                      await sendMessage({
                        text: "I want to chat with an agent on WhatsApp",
                      });
                    }}
                    className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSending}
                  >
                    WhatsApp Agent
                  </button>
                </div>
              )}

              {!serviceUnavailable &&
                chatMessages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-color)] text-white">
                        <Bot size={16} />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl p-3 text-sm shadow ${
                        isUser
                          ? "rounded-br-sm bg-[var(--brand-color)] text-white"
                          : "rounded-bl-sm bg-white text-slate-700"
                      }`}
                    >
                      {!isUser && (
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {companyName}
                        </p>
                      )}
                      {message.text}
                    </div>
                    {isUser && (
                      <div className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                );
              })}

              {!serviceUnavailable && isSending && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Bot size={14} />
                  {companyName} is typing...
                </div>
              )}

              {!serviceUnavailable && error && (
                <p className="rounded-xl border border-red-100 bg-red-50 p-2 text-xs text-red-600">
                  Something went wrong. Please try again.
                </p>
              )}

              <div ref={messagesEndRef} />
            </div>

            {!serviceUnavailable && (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const text = input.trim();
                  if (!text) return;

                  setInput("");
                  await sendMessage({ text });
                }}
                className="border-t border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about properties, locations, or prices..."
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-color)] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="fixed right-5 bottom-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-105 hover:shadow-2xl"
        style={{ backgroundColor: brand }}
        aria-label={open ? "Hide real estate chat" : "Open real estate chat"}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
}
