import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  if (process.env.DEV_MODE !== "true") {
    return NextResponse.json(
      { error: "Reinicio deshabilitado (DEV_MODE no está activo)." },
      { status: 403 }
    );
  }

  cookies().delete("senal_entry");
  cookies().delete("senal_session");

  return NextResponse.json({ ok: true });
}
