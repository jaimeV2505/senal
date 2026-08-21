import { NextResponse } from "next/server";
import { createEntryPass } from "@/lib/auth";

export async function POST(req) {
  const { key } = await req.json();

  if (!key || key !== process.env.ENTRY_KEY) {
    return NextResponse.json(
      { error: "Clave incorrecta." },
      { status: 401 }
    );
  }

  await createEntryPass();
  return NextResponse.json({ ok: true });
}
