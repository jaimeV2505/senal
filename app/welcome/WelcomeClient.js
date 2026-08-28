"use client";

import { useEffect, useRef, useState } from "react";

const LINES = [
  "Desde la última vez, pensé que los sueños pararían.",
  "No fue así.",
  "Sigo llegando aquí cuando pienso en ti.",
  "Hay cosas que últimamente me hacen pensar en ti.",
  "Y por ahora, prefiero que sigan siendo solo nuestras.",
];

export default function WelcomeClient() {
  const [linesShown, setLinesShown] = useState([]);
  const [displayed, setDisplayed] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [decodeDone, setDecodeDone] = useState(false);
  const [choice, setChoice] = useState(null); // null | "si" | "no"
  const [sending, setSending] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);
  const [keyError, setKeyError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (lineIndex >= LINES.length) {
      setDecodeDone(true);
      return;
    }
    const text = LINES[lineIndex];
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(() => {
          setLinesShown((prev) => [...prev, text]);
          setDisplayed("");
          setLineIndex((n) => n + 1);
        }, 650);
      }
    }, 38);
    return () => clearInterval(interval);
  }, [lineIndex]);

  async function respond(value) {
    setSending(true);
    setChoice(value);
    try {
      await fetch("/api/welcome-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: value }),
      });
      if (value === "si") {
        const res = await fetch("/api/reveal-key");
        const data = await res.json();
        if (res.ok) {
          setRevealedKey(data.key);
        } else {
          setKeyError(data.error || "no se pudo obtener la clave.");
        }
      }
    } finally {
      setSending(false);
    }
  }

  async function handleCopy() {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // si el navegador bloquea el portapapeles, la persona la copia a mano
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
        position: "relative",
        overflow: "hidden",
      }}
      className="scanlines"
    >
      <PulseWave />

      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          gap: 32,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: 18,
            lineHeight: 1.9,
            letterSpacing: "0.02em",
            minHeight: 160,
            color: "var(--text)",
          }}
        >
          {linesShown.map((line, i) => (
            <p key={i} style={{ margin: 0, opacity: 0.55 }}>
              {line}
            </p>
          ))}
          {lineIndex < LINES.length && (
            <p style={{ margin: 0 }}>
              {displayed}
              <Cursor />
            </p>
          )}
        </div>

        {decodeDone && choice === null && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              animation: "fadeIn 0.6s ease",
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "var(--muted)",
                letterSpacing: "0.1em",
              }}
            >
              ¿TE ATREVES A SEGUIR?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <ChoiceButton
                onClick={() => respond("si")}
                disabled={sending}
                variant="accent"
              >
                [ SÍ ]
              </ChoiceButton>
              <ChoiceButton onClick={() => respond("no")} disabled={sending}>
                [ NO ]
              </ChoiceButton>
            </div>
          </div>
        )}

        {choice === "si" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              animation: "fadeIn 0.6s ease",
            }}
          >
            <p style={{ fontSize: 14, color: "var(--accent)", letterSpacing: "0.03em" }}>
              recibido.
            </p>

            {revealedKey && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em" }}>
                  ESTA ES TU CLAVE DE ACCESO
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid var(--accent-dim)",
                    background: "var(--surface)",
                    padding: "12px 14px",
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      letterSpacing: "0.08em",
                      color: "var(--accent)",
                      userSelect: "text",
                    }}
                  >
                    {revealedKey}
                  </span>
                  <button
                    onClick={handleCopy}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "6px 10px",
                      fontFamily: "var(--font-display)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {copied ? "✓" : "COPIAR"}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                  guárdala. te la va a pedir la pantalla de entrada al canal.
                </p>
              </div>
            )}

            {keyError && (
              <p style={{ fontSize: 12, color: "var(--danger)" }}>{keyError}</p>
            )}

            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              revisa cuando puedas, cuando pienses en esa persona, o cuando
              simplemente quieras decir algo.
            </p>
            <button
              onClick={() => (window.location.href = "/login")}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                padding: "10px 16px",
                fontFamily: "var(--font-display)",
                fontSize: 12,
                letterSpacing: "0.15em",
                marginTop: 8,
              }}
            >
              [ ENTRAR ]
            </button>
          </div>
        )}

        {choice === "no" && (
          <div style={{ animation: "fadeIn 0.6s ease" }}>
            <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
              está bien. no hay ninguna prisa. puedes volver cuando quieras.
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function Cursor() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 16,
        background: "var(--accent)",
        marginLeft: 2,
        animation: "blink 0.9s steps(1) infinite",
        verticalAlign: "-2px",
      }}
    >
      <style jsx>{`
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}

function ChoiceButton({ children, onClick, disabled, variant }) {
  const accent = variant === "accent";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        border: `1px solid ${accent ? "var(--accent)" : "var(--border)"}`,
        color: accent ? "var(--accent)" : "var(--muted)",
        padding: "10px 18px",
        fontFamily: "var(--font-display)",
        fontSize: 12,
        letterSpacing: "0.15em",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function PulseWave() {
  return (
    <svg
      viewBox="0 0 400 60"
      style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(90%, 400px)",
        opacity: 0.35,
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      <polyline
        points="0,30 40,30 55,10 70,50 85,30 400,30"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
      >
        <animate
          attributeName="points"
          dur="2.4s"
          repeatCount="indefinite"
          values="
            0,30 40,30 55,10 70,50 85,30 400,30;
            0,30 40,30 55,50 70,10 85,30 400,30;
            0,30 40,30 55,10 70,50 85,30 400,30"
        />
      </polyline>
    </svg>
  );
}
