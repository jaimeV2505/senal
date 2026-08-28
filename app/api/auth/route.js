import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { checkRateLimit, clearRateLimit, getClientIp, MAX_ATTEMPTS } from "@/lib/ratelimit";
import { notifyTelegram } from "@/lib/notify";

export async function POST(req) {
  const ip = getClientIp(req);
  const { blocked, count } = await checkRateLimit("auth", ip);

  if (blocked) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un rato antes de volver a intentar." },
      { status: 429 }
    );
  }

  const { key } = await req.json();

  let user = null;
  if (key === process.env.KEY_A) user = "A";
  else if (key === process.env.KEY_B) user = "B";

  if (!user) {
    if (count === MAX_ATTEMPTS) {
      await notifyTelegram(
        "⚠️ alguien falló la clave personal de acceso varias veces seguidas. Puede que alguien esté intentando adivinarla."
      );
    }
    return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
  }

  await clearRateLimit("auth", ip);
  await createSession(user);
  return NextResponse.json({ ok: true, user });
}
