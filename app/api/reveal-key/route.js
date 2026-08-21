import { NextResponse } from "next/server";
import { hasEntryPass } from "@/lib/auth";
import kv from "@/lib/kv";

// Solo se revela la clave si:
// 1. ya se pasó por la puerta de entrada (ENTRY_KEY), y
// 2. la respuesta guardada en la bienvenida fue "sí".
// Así nadie puede pedir la clave saltándose el flujo.
export async function GET() {
  const okEntry = await hasEntryPass();
  if (!okEntry) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const response = await kv.get("welcome:response");
  if (!response || response.choice !== "si") {
    return NextResponse.json(
      { error: "Todavía no hay una respuesta de 'sí' registrada." },
      { status: 403 }
    );
  }

  const key = process.env.KEY_B;
  if (!key) {
    return NextResponse.json(
      { error: "KEY_B no está configurada en el servidor." },
      { status: 500 }
    );
  }

  return NextResponse.json({ key });
}
