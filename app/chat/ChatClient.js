"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  getSavedPassphrase,
  savePassphrase,
  clearPassphrase,
  deriveKey,
  encryptText,
  decryptText,
} from "@/lib/crypto-client";

const POLL_MS = 3000;

export default function ChatClient({ user }) {
  const [messages, setMessages] = useState([]);
  const [ttlSeconds, setTtlSeconds] = useState(86400);
  const [text, setText] = useState("");
  const [viewOnce, setViewOnce] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [encKey, setEncKey] = useState(null);
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState("");
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  // Deriva la llave de cifrado a partir de la frase guardada en este
  // navegador (nunca se manda al servidor). Si no hay ninguna, se pide.
  useEffect(() => {
    const saved = getSavedPassphrase();
    if (saved) {
      deriveKey(saved).then(setEncKey);
    } else {
      setNeedsPassphrase(true);
    }
  }, []);

  async function handleSetPassphrase(e) {
    e.preventDefault();
    if (!passphraseInput.trim()) return;
    savePassphrase(passphraseInput.trim());
    const key = await deriveKey(passphraseInput.trim());
    setEncKey(key);
    setNeedsPassphrase(false);
    setPassphraseInput("");
  }

  function handleChangePassphrase() {
    clearPassphrase();
    setEncKey(null);
    setNeedsPassphrase(true);
  }

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      const list = data.messages || [];

      const decorated = await Promise.all(
        list.map(async (m) => {
          if (m.type !== "text") return m;
          if (!encKey) return { ...m, plain: null, pending: true };
          try {
            const plain = await decryptText(encKey, m.ciphertext, m.iv);
            return { ...m, plain };
          } catch {
            return { ...m, plain: null, decryptError: true };
          }
        })
      );

      setMessages(decorated);
      if (data.ttlSeconds) setTtlSeconds(data.ttlSeconds);
    } catch {
      // silencioso: se reintenta en el siguiente poll
    }
  }, [router, encKey]);

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
    if (!text.trim() || sending || !encKey) return;
    setSending(true);
    setUploadError("");
    const value = text;
    const wasViewOnce = viewOnce;
    setText("");
    setViewOnce(false);
    try {
      const { ciphertext, iv } = await encryptText(encKey, value);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", ciphertext, iv, viewOnce: wasViewOnce }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `error ${res.status} al enviar`);
      }
      await fetchMessages();
    } catch (err) {
      setUploadError(err.message || "no se pudo enviar el mensaje.");
      setText(value); // devuelve el texto para que no se pierda
    } finally {
      setSending(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!file) return;

    setUploadError("");
    setUploading(true);
    try {
      const type = file.type.startsWith("video/") ? "video" : "image";

      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, url: blob.url, viewOnce }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `error ${res.status} al guardar el mensaje`);
      }

      await fetchMessages();
      setViewOnce(false);
    } catch (err) {
      setUploadError(err.message || "no se pudo enviar el archivo.");
    } finally {
      setUploading(false);
    }
  }

  if (needsPassphrase) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <form
          onSubmit={handleSetPassphrase}
          style={{
            width: "100%",
            maxWidth: 380,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 12,
              letterSpacing: "0.2em",
              color: "var(--muted)",
              textAlign: "center",
            }}
          >
            FRASE DE CIFRADO
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, textAlign: "center" }}>
            Esta frase nunca se manda al servidor. Solo sirve para descifrar
            los mensajes en este navegador. Los dos deben usar exactamente la
            misma — pónganse de acuerdo antes, por fuera de aquí.
          </p>
          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
              padding: "18px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ color: "var(--accent)" }}>&gt;</span>
            <input
              type="password"
              value={passphraseInput}
              onChange={(e) => setPassphraseInput(e.target.value)}
              placeholder="frase secreta compartida"
              autoComplete="off"
              autoFocus
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text)",
                fontSize: 15,
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!passphraseInput.trim()}
            style={{
              background: "transparent",
              border: `1px solid ${passphraseInput.trim() ? "var(--accent)" : "var(--border)"}`,
              color: passphraseInput.trim() ? "var(--accent)" : "var(--muted)",
              padding: "12px 16px",
              fontFamily: "var(--font-display)",
              fontSize: 12,
              letterSpacing: "0.2em",
            }}
          >
            [ DESBLOQUEAR ]
          </button>
        </form>
      </main>
    );
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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleChangePassphrase}
            title="cambiar la frase de cifrado"
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
            CLAVE
          </button>
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
        </div>
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

      {uploadError && (
        <div
          style={{
            color: "var(--danger)",
            fontSize: 11,
            padding: "0 20px",
            letterSpacing: "0.05em",
          }}
        >
          {uploadError}
        </div>
      )}

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
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelected}
          style={{ display: "none" }}
        />
        <button
          type="button"
          onClick={() => setViewOnce((v) => !v)}
          title="una sola vista: se autodestruye tras verse una vez"
          style={{
            background: viewOnce ? "var(--accent-dim)" : "transparent",
            border: `1px solid ${viewOnce ? "var(--accent)" : "var(--border)"}`,
            color: viewOnce ? "var(--bg)" : "var(--muted)",
            padding: "0 12px",
            fontFamily: "var(--font-display)",
            fontSize: 14,
          }}
        >
          👁
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="adjuntar foto o video"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: uploading ? "var(--muted)" : "var(--text)",
            padding: "0 14px",
            fontFamily: "var(--font-display)",
            fontSize: 15,
          }}
        >
          {uploading ? "…" : "+"}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={viewOnce ? "mensaje de una sola vista..." : "escribe algo..."}
          autoComplete="off"
          style={{
            flex: 1,
            background: "var(--surface)",
            border: `1px solid ${viewOnce ? "var(--accent-dim)" : "var(--border)"}`,
            color: "var(--text)",
            padding: "12px 14px",
            outline: "none",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending || !encKey}
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
  const burned = msg.type === "burned";

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
          padding: msg.type === "text" || burned ? "10px 14px" : 4,
          fontSize: 14,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxWidth: 280,
          fontStyle: burned ? "italic" : "normal",
          color: burned ? "var(--muted)" : "var(--text)",
        }}
      >
        {burned && "🔥 autodestruido tras la primera vista"}
        {!burned && msg.type === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.url}
            alt=""
            style={{ display: "block", maxWidth: "100%", maxHeight: 320 }}
          />
        )}
        {!burned && msg.type === "video" && (
          <video
            src={msg.url}
            controls
            style={{ display: "block", maxWidth: "100%", maxHeight: 320 }}
          />
        )}
        {!burned && msg.type === "text" && msg.decryptError && (
          <span style={{ color: "var(--danger)" }}>
            no se pudo descifrar (frase incorrecta)
          </span>
        )}
        {!burned && msg.type === "text" && msg.pending && (
          <span style={{ color: "var(--muted)" }}>descifrando...</span>
        )}
        {!burned && msg.type === "text" && !msg.decryptError && !msg.pending && msg.plain}
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
        {!burned && <span>· se borra en {remainingLabel}</span>}
        {!burned && msg.viewOnce && <span>· 👁 una vista</span>}
        {!burned && own && <span>{msg.seen ? "· visto" : "· enviado"}</span>}
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
