import { NextResponse } from "next/server";
import { getSession, otherUser } from "@/lib/auth";
import kv from "@/lib/kv";

const INDEX_KEY = "messages:index";
const TTL = parseInt(process.env.MESSAGE_TTL_SECONDS || "86400", 10);

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const other = otherUser(user);
  const now = Date.now();

  // Marca que este usuario ha revisado la conversación justo ahora.
  await kv.set(`lastSeen:${user}`, now);
  const otherLastSeen = (await kv.get(`lastSeen:${other}`)) || 0;

  const ids = await kv.zrange(INDEX_KEY, 0, -1);
  if (!ids || ids.length === 0) {
    return NextResponse.json({ messages: [], you: user });
  }

  const keys = ids.map((id) => `msg:${id}`);
  const raw = await kv.mget(...keys);

  const messages = [];
  const expiredIds = [];

  raw.forEach((msg, i) => {
    if (!msg) {
      expiredIds.push(ids[i]);
      return;
    }
    messages.push({
      ...msg,
      seen: msg.from === user ? msg.at <= otherLastSeen : true,
    });
  });

  // Limpieza perezosa del índice para mensajes ya expirados.
  if (expiredIds.length > 0) {
    await kv.zrem(INDEX_KEY, ...expiredIds);
  }

  messages.sort((a, b) => a.at - b.at);

  return NextResponse.json({ messages, you: user, ttlSeconds: TTL });
}

export async function POST(req) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const at = Date.now();
  const message = { id, from: user, text: text.trim().slice(0, 4000), at };

  await kv.set(`msg:${id}`, message, { ex: TTL });
  await kv.zadd(INDEX_KEY, { score: at, member: id });

  return NextResponse.json({ ok: true, message });
}
