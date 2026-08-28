import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Nunca devuelve los valores, solo si existen o no — así se puede confirmar
// rápido cuál variable falta en este deployment específico sin exponer nada.
// Solo exige sesión válida (no DEV_MODE), porque si no, no habría forma de
// diagnosticar por qué DEV_MODE mismo no está tomando efecto.
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const check = (name) => ({
    name,
    set: Boolean(process.env[name] && process.env[name].length > 0),
  });

  const vars = [
    "AUTH_SECRET",
    "ENTRY_KEY",
    "KEY_A",
    "KEY_B",
    "MESSAGE_TTL_SECONDS",
    "KV_REST_API_URL",
    "KV_REST_API_TOKEN",
    "BLOB_READ_WRITE_TOKEN",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "DEV_MODE",
  ].map(check);

  return NextResponse.json({
    vars,
    vercelEnv: process.env.VERCEL_ENV || "desconocido", // production | preview | development
    url: process.env.VERCEL_URL || "desconocida",
  });
}
