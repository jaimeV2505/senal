import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

export async function POST(req) {
  const { key } = await req.json();

  let user = null;
  if (key === process.env.KEY_A) user = "A";
  else if (key === process.env.KEY_B) user = "B";

  if (!user) {
    return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
  }

  await createSession(user);
  return NextResponse.json({ ok: true, user });
}
