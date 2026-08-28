"use client";

import { useState, useRef, useEffect } from "react";

export default function EntryGate() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/entry", {
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
      window.location.href = "/welcome";
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
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 380,
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
          SEÑAL · CANAL CIFRADO
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
            placeholder="clave de acceso"
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
            transition: "opacity 0.2s",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "VERIFICANDO..." : "[ CONECTAR ]"}
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
    </main>
  );
}
