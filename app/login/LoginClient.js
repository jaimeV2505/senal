"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginClient({ currentUser }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "algo no coincide.");
        setLoading(false);
        return;
      }
      router.push("/chat");
    } catch {
      setError("no se pudo conectar.");
      setLoading(false);
    }
  }

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
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 18 }}>
        {currentUser && (
          <div
            style={{
              border: "1px solid var(--border)",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              ya hay una sesión activa como <strong style={{ color: "var(--text)" }}>{currentUser}</strong> en
              este navegador.
            </p>
            <button
              onClick={() => router.push("/chat")}
              style={{
                background: "transparent",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                padding: "8px 14px",
                fontFamily: "var(--font-display)",
                fontSize: 11,
                letterSpacing: "0.15em",
                alignSelf: "flex-start",
              }}
            >
              [ CONTINUAR COMO {currentUser} ]
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 13,
              letterSpacing: "0.25em",
              color: "var(--muted)",
              textAlign: "center",
            }}
          >
            {currentUser ? "ENTRAR CON OTRA CLAVE" : "IDENTIFICACIÓN"}
          </div>

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
              ref={inputRef}
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="tu clave"
              autoComplete="off"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text)",
                fontSize: 15,
                letterSpacing: "0.05em",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !key}
            style={{
              background: "transparent",
              border: `1px solid ${key ? "var(--accent)" : "var(--border)"}`,
              color: key ? "var(--accent)" : "var(--muted)",
              padding: "12px 16px",
              fontFamily: "var(--font-display)",
              fontSize: 12,
              letterSpacing: "0.2em",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "VERIFICANDO..." : "[ ENTRAR ]"}
          </button>

          {error && (
            <div
              style={{
                color: "var(--danger)",
                fontSize: 12,
                textAlign: "center",
                letterSpacing: "0.05em",
              }}
            >
              {error}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
