"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DevClient() {
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function handleReset() {
    setStatus("reiniciando...");
    try {
      const r1 = await fetch("/api/dev-reset", { method: "POST" });
      const r2 = await fetch("/api/reset-local", { method: "POST" });
      if (!r1.ok || !r2.ok) {
        setStatus("algo falló al reiniciar. revisa la consola.");
        return;
      }
      window.localStorage.removeItem("senal_passphrase_A");
      window.localStorage.removeItem("senal_passphrase_B");
      setStatus("listo. redirigiendo...");
      setTimeout(() => router.push("/"), 600);
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
          maxWidth: 380,
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
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          Esto borra la respuesta de bienvenida, todos los mensajes (y sus
          fotos/videos), y cierra tu sesión, para volver a probar el flujo
          completo desde cero. Solo funciona mientras <code>DEV_MODE=true</code> en
          las variables de entorno.
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
