"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 3000;

export default function ChatClient({ user }) {
  const [messages, setMessages] = useState([]);
  const [ttlSeconds, setTtlSeconds] = useState(86400);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef(null);
  const router = useRouter();

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setMessages(data.messages || []);
      if (data.ttlSeconds) setTtlSeconds(data.ttlSeconds);
    } catch {
      // silencioso: se reintenta en el siguiente poll
    }
  }, [router]);

  useEffect(() => {
    fetchMessages();
    const poll = setInterval(fetchMessages, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const value = text;
    setText("");
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      await fetchMessages();
    } finally {
      setSending(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-display)",
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "var(--muted)",
          }}
        >
          <PulseDot />
          CANAL ACTIVO · {user}
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--muted)",
            padding: "6px 12px",
            fontSize: 11,
            letterSpacing: "0.1em",
            fontFamily: "var(--font-display)",
          }}
        >
          SALIR
        </button>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              color: "var(--muted)",
              fontSize: 13,
              textAlign: "center",
              marginTop: 40,
              letterSpacing: "0.05em",
            }}
          >
            silencio de radio. escribe algo.
          </p>
        )}

        {messages.map((m) => (
          <Bubble key={m.id} msg={m} own={m.from === user} ttlSeconds={ttlSeconds} now={now} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        style={{
          display: "flex",
          gap: 10,
          padding: "14px 20px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="escribe algo..."
          autoComplete="off"
          style={{
            flex: 1,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "12px 14px",
            outline: "none",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          style={{
            background: "transparent",
            border: `1px solid ${text.trim() ? "var(--accent)" : "var(--border)"}`,
            color: text.trim() ? "var(--accent)" : "var(--muted)",
            padding: "0 20px",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            letterSpacing: "0.1em",
          }}
        >
          ENVIAR
        </button>
      </form>
    </main>
  );
}

function Bubble({ msg, own, ttlSeconds, now }) {
  const expiresAt = msg.at + ttlSeconds * 1000;
  const remainingMs = Math.max(0, expiresAt - now);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingLabel =
    remainingMin >= 60
      ? `${Math.floor(remainingMin / 60)}h`
      : `${remainingMin}m`;
  const urgent = remainingMs < 5 * 60 * 1000;

  return (
    <div
      style={{
        alignSelf: own ? "flex-end" : "flex-start",
        maxWidth: "78%",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: own ? "flex-end" : "flex-start",
      }}
    >
      <div
        className="msg-text"
        style={{
          background: own ? "var(--surface-2)" : "var(--surface)",
          border: `1px solid ${own ? "var(--accent-dim)" : "var(--border)"}`,
          padding: "10px 14px",
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.text}
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          fontSize: 10,
          color: urgent ? "var(--danger)" : "var(--muted)",
          letterSpacing: "0.05em",
        }}
      >
        <span>{new Date(msg.at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
        <span>· se borra en {remainingLabel}</span>
        {own && <span>{msg.seen ? "· visto" : "· enviado"}</span>}
      </div>
    </div>
  );
}

function PulseDot() {
  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: "var(--accent)",
        display: "inline-block",
        animation: "pulse 1.6s ease-in-out infinite",
      }}
    >
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(255, 180, 84, 0.5);
          }
          50% {
            opacity: 0.6;
            box-shadow: 0 0 0 4px rgba(255, 180, 84, 0);
          }
        }
      `}</style>
    </span>
  );
}
