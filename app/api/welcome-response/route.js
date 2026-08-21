import { NextResponse } from "next/server";
import { hasEntryPass, getSession } from "@/lib/auth";
import kv from "@/lib/kv";

// Se guarda solo la elección y la hora del servidor. Nada de IP ni ubicación:
// la persona sabe exactamente qué se registra porque es ella quien pulsa el botón.
export async function POST(req) {
  const okEntry = await hasEntryPass();
  if (!okEntry) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { choice } = await req.json();
  if (choice !== "si" && choice !== "no") {
    return NextResponse.json({ error: "Elección inválida." }, { status: 400 });
  }

  await kv.set("welcome:response", {
    choice,
    at: Date.now(),
  });

  // Aviso instantáneo fuera de la app (no depende de que alguien tenga
  // el chat abierto ni de hacer polling): un mensaje de Telegram.
  if (choice === "si") {
    await notifyTelegram("la señal fue respondida: sí.");
  } else {
    await notifyTelegram("la señal fue respondida: no, todavía.");
  }

  return NextResponse.json({ ok: true });
}

async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // notificación desactivada si no está configurada

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // si Telegram falla, no rompe el flujo principal
  }
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const response = (await kv.get("welcome:response")) || null;
  return NextResponse.json({ response });
}
