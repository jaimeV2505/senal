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

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const response = (await kv.get("welcome:response")) || null;
  return NextResponse.json({ response });
}
