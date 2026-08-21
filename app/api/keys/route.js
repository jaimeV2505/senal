import { NextResponse } from "next/server";
import { getSession, otherUser } from "@/lib/auth";
import kv from "@/lib/kv";

// Una llave pública no es un secreto: existe justamente para ser compartida.
// Lo único que nunca toca este servidor es la llave privada de cada quien,
// que vive únicamente en el navegador de esa persona.

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const other = otherUser(user);
  const otherPublicKey = (await kv.get(`pubkey:${other}`)) || null;

  return NextResponse.json({ otherPublicKey });
}

export async function POST(req) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { publicKey } = await req.json();
  if (!publicKey) {
    return NextResponse.json({ error: "Falta la llave pública." }, { status: 400 });
  }

  await kv.set(`pubkey:${user}`, publicKey);

  return NextResponse.json({ ok: true });
}
