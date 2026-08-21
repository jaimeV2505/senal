"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_MESSAGE =
  "Desde la última vez, pensé que los sueños pararían. No fue así.";

export default function WelcomeClient() {
  const [displayed, setDisplayed] = useState("");
  const [decodeDone, setDecodeDone] = useState(false);
  const [choice, setChoice] = useState(null); // null | "si" | "no"
  const [sending, setSending] = useState(false);
  const fullText = useRef(DEFAULT_MESSAGE);
  const router = useRouter();

  useEffect(() => {
    let i = 0;
    const text = fullText.current;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDecodeDone(true);
      }
    }, 38);
    return () => clearInterval(interval);
  }, []);

  async function respond(value) {
    setSending(true);
    setChoice(value);
    try {
      await fetch("/api/welcome-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: value }),
      });
    } finally {
      setSending(false);
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
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.7,
            letterSpacing: "0.02em",
            minHeight: 96,
            color: "var(--text)",
          }}
        >
          {displayed}
          {!decodeDone && <Cursor />}
        </p>

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
              ¿QUIERES CONTINUAR ESTA CONVERSACIÓN?
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
              recibido. las instrucciones llegan pronto.
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              revisa cuando puedas, cuando pienses en esa persona, o cuando
              simplemente quieras decir algo.
            </p>
            <button
              onClick={() => router.push("/login")}
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
