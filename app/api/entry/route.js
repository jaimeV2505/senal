import { NextResponse } from "next/server";
import { createEntryPass } from "@/lib/auth";
import { checkRateLimit, clearRateLimit, getClientIp, MAX_ATTEMPTS } from "@/lib/ratelimit";
import { notifyTelegram } from "@/lib/notify";

export async function POST(req) {
  const ip = getClientIp(req);
  const { blocked, count } = await checkRateLimit("entry", ip);

  if (blocked) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un rato antes de volver a intentar." },
      { status: 429 }
    );
  }

  const { key } = await req.json();

  if (!key || key !== process.env.ENTRY_KEY) {
    if (count === MAX_ATTEMPTS) {
      await notifyTelegram(
        "⚠️ alguien falló la clave de entrada varias veces seguidas. Puede que alguien esté intentando adivinarla."
      );
    }
    return NextResponse.json(
      { error: "Clave incorrecta." },
      { status: 401 }
    );
  }

  await clearRateLimit("entry", ip);
  await createEntryPass();
  return NextResponse.json({ ok: true });
}
