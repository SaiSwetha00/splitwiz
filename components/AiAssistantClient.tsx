"use client";

import { useRef, useState, useEffect } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface InitialContext {
  tripsCount: number;
  activeTripsCount: number;
  netBalance: number;
  currency: string;
}

interface Props {
  displayName: string;
  initialContext: InitialContext;
}

const QUICK_CHIPS = [
  "📊 Analyze my spending this month",
  "💰 Where can I save money?",
  "⚖️ Show me my unsettled balances",
  "📅 Compare this month vs last month",
  "🔔 What's due this week?",
  "✈️ Which trip cost the most?",
];

function buildWelcomeMsg(
  displayName: string,
  ctx: InitialContext
): ChatMessage {
  const balanceText =
    ctx.netBalance >= 0
      ? `₹${Math.abs(ctx.netBalance).toFixed(0)} owed to you`
      : `₹${Math.abs(ctx.netBalance).toFixed(0)} you owe`;
  const tripText = `${ctx.activeTripsCount} active trip${ctx.activeTripsCount !== 1 ? "s" : ""}`;
  return {
    id: "welcome",
    role: "assistant",
    content: `Hi ${displayName}! 👋 I can see you have ${tripText} and ${balanceText}. How can I help today?`,
    timestamp: new Date(),
  };
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "12px 16px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--muted)",
            animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export function AiAssistantClient({ displayName, initialContext }: Props) {
  const idRef = useRef(0);
  function nextId() {
    return String(++idRef.current);
  }

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildWelcomeMsg(displayName, initialContext),
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setShowChips(false);
    setInput("");

    const userMsg: ChatMessage = {
      id: nextId(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    const placeholderId = nextId();
    const placeholder: ChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, placeholder]);
    setIsStreaming(true);

    const historyForApi = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: historyForApi }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, content: "Sorry, I couldn't process that. Please try again." }
              : m
          )
        );
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + chunk },
          ];
        });
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  function handleChip(chip: string) {
    sendMessage(chip);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([buildWelcomeMsg(displayName, initialContext)]);
    setShowChips(true);
  }

  function startVoice() {
    const w = window as unknown as Record<string, unknown>;
    const SR = w["webkitSpeechRecognition"] ?? w["SpeechRecognition"];
    if (!SR) {
      setVoiceError("Voice not supported in this browser");
      return;
    }

    const recognition = new (SR as SpeechRecognitionConstructor)();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput((prev) => prev + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => {
      setVoiceError("Voice recognition failed");
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    setIsListening(true);
    setVoiceError(null);
    recognition.start();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        maxWidth: 800,
        margin: "0 auto",
        padding: "0 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 0 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🤖</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>SplitWiz AI</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Your personal finance assistant
            </div>
          </div>
        </div>
        <button
          onClick={clearChat}
          style={{
            fontSize: 12,
            color: "var(--muted)",
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          Clear chat
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 0",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                🤖
              </div>
            )}
            <div
              style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background:
                  msg.role === "user"
                    ? "var(--accent)"
                    : "var(--surface)",
                color:
                  msg.role === "user"
                    ? "var(--accent-foreground)"
                    : "inherit",
                border:
                  msg.role === "assistant" ? "1px solid var(--border)" : "none",
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.role === "assistant" &&
              isStreaming &&
              msg.id === messages[messages.length - 1]?.id &&
              msg.content === "" ? (
                <TypingIndicator />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showChips && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "8px 0",
            flexShrink: 0,
          }}
        >
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              disabled={isStreaming}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontSize: 13,
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {voiceError && (
        <div
          style={{
            fontSize: 12,
            color: "var(--destructive, #ef4444)",
            padding: "4px 0",
            flexShrink: 0,
          }}
        >
          {voiceError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 0 16px",
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          alignItems: "flex-end",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your finances..."
          disabled={isStreaming}
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 14,
            background: "var(--background)",
            color: "inherit",
            fontFamily: "inherit",
            lineHeight: 1.5,
            maxHeight: 120,
            overflowY: "auto",
            outline: "none",
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={startVoice}
          disabled={isStreaming || isListening}
          title="Voice input"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: isListening ? "var(--accent)" : "var(--surface)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🎤
        </button>
        <button
          onClick={() => sendMessage(input)}
          disabled={isStreaming || !input.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: "var(--accent)",
            color: "var(--accent-foreground)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
            opacity: isStreaming || !input.trim() ? 0.5 : 1,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
