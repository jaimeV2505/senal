"use client";

import { useState, useEffect } from "react";

export default function DevClient() {
  const [status, setStatus] = useState("");
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);

  useEffect(() => {
    runDiagnosis();
  }, []);

  async function runDiagnosis() {
    setDiagnosing(true);
    try {
      const res = await fetch("/api/dev-diagnose", { cache: "no-store" });
      const data = await res.json();
      setDiagnosis(data);
    } catch {
      setDiagnosis(null);
    } finally {
      setDiagnosing(false);
    }
  }

  async function handleReset() {
    setStatus("reiniciando...");
    try {
      const r1 = await fetch("/api/dev-reset", { method: "POST" });
      const r2 = await fetch("/api/reset-local", { method: "POST" });
      if (!r1.ok || !r2.ok) {
        setStatus("algo falló al reiniciar. revisa la consola.");
        return;
      }
      setStatus("listo. redirigiendo...");
      setTimeout(() => (window.location.href = "/"), 600);
    } catch {
      setStatus("no se pudo conectar.");
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 420,
          width: "100%",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            letterSpacing: "0.2em",
            color: "var(--muted)",
          }}
        >
          MODO DESARROLLO
        </p>

        <div style={{ border: "1px solid var(--border)", padding: "14px 16px" }}>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.15em",
              color: "var(--muted)",
              marginBottom: 10,
            }}
          >
            DIAGNÓSTICO DE ESTE DEPLOYMENT
          </p>

          {diagnosing && (
            <p style={{ fontSize: 12, color: "var(--muted)" }}>revisando...</p>
          )}

          {diagnosis && (
            <>
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                ambiente: <strong style={{ color: "var(--text)" }}>{diagnosis.vercelEnv}</strong>
                {" · "}
                {diagnosis.url}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {diagnosis.vars.map((v) => (
                  <div
                    key={v.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    <span style={{ color: "var(--muted)" }}>{v.name}</span>
                    <span style={{ color: v.set ? "var(--accent)" : "var(--danger)" }}>
                      {v.set ? "✓ presente" : "✗ falta"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            onClick={runDiagnosis}
            style={{
              marginTop: 12,
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              padding: "6px 12px",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              letterSpacing: "0.1em",
            }}
          >
            VOLVER A REVISAR
          </button>
        </div>

        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          El botón de abajo borra la respuesta de bienvenida, todos los
          mensajes (y sus fotos/videos), y cierra tu sesión, para volver a
          probar el flujo completo desde cero. Solo funciona mientras{" "}
          <code>DEV_MODE=true</code>.
        </p>
        <button
          onClick={handleReset}
          style={{
            background: "transparent",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            padding: "12px 16px",
            fontFamily: "var(--font-display)",
            fontSize: 12,
            letterSpacing: "0.15em",
          }}
        >
          [ REINICIAR TODO ]
        </button>
        {status && (
          <p style={{ fontSize: 12, color: "var(--accent)" }}>{status}</p>
        )}
      </div>
    </main>
  );
}
