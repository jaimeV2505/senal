import { NextResponse } from "next/server";
import { getSession, otherUser } from "@/lib/auth";
import kv from "@/lib/kv";
import { del } from "@vercel/blob";

const INDEX_KEY = "messages:index";
const TTL = parseInt(process.env.MESSAGE_TTL_SECONDS || "86400", 10);
const SAFETY_MARGIN = 3600; // colchón extra en Redis para que la limpieza explícita mande

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const other = otherUser(user);
  const now = Date.now();

  await kv.set(`lastSeen:${user}`, now);
  const otherLastSeen = (await kv.get(`lastSeen:${other}`)) || 0;

  const ids = await kv.zrange(INDEX_KEY, 0, -1);
  if (!ids || ids.length === 0) {
    return NextResponse.json({ messages: [], you: user, ttlSeconds: TTL });
  }

  const keys = ids.map((id) => `msg:${id}`);
  const raw = await kv.mget(...keys);

  const messages = [];
  const idsToRemove = [];
  const blobsToDelete = [];

  for (let i = 0; i < raw.length; i++) {
    const msg = raw[i];
    if (!msg) {
      idsToRemove.push(ids[i]);
      continue;
    }
    if (msg.expiresAt && now >= msg.expiresAt) {
      idsToRemove.push(ids[i]);
      if (msg.url) blobsToDelete.push(msg.url);
      continue;
    }
    messages.push({
      ...msg,
      seen: msg.from === user ? msg.at <= otherLastSeen : true,
    });
  }

  if (idsToRemove.length > 0) {
    await kv.zrem(INDEX_KEY, ...idsToRemove);
    await Promise.all(idsToRemove.map((id) => kv.del(`msg:${id}`)));
  }
  if (blobsToDelete.length > 0) {
    await Promise.all(blobsToDelete.map((url) => del(url).catch(() => {})));
  }

  messages.sort((a, b) => a.at - b.at);

  return NextResponse.json({ messages, you: user, ttlSeconds: TTL });
}

export async function POST(req) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const type = body.type === "image" || body.type === "video" ? body.type : "text";

  let message;
  const id = crypto.randomUUID();
  const at = Date.now();
  const expiresAt = at + TTL * 1000;

  if (type === "text") {
    const text = (body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });
    }
    message = { id, from: user, type, text: text.slice(0, 4000), at, expiresAt };
  } else {
    if (!body.url) {
      return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    }
    message = { id, from: user, type, url: body.url, at, expiresAt };
  }

  await kv.set(`msg:${id}`, message, { ex: TTL + SAFETY_MARGIN });
  await kv.zadd(INDEX_KEY, { score: at, member: id });

  return NextResponse.json({ ok: true, message });
}
