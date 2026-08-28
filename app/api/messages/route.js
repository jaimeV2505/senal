import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession, otherUser } from "@/lib/auth";
import kv from "@/lib/kv";
import { del } from "@vercel/blob";

const INDEX_KEY = "messages:index";
const TTL = parseInt(process.env.MESSAGE_TTL_SECONDS || "86400", 10);
const SAFETY_MARGIN = 3600; // colchón extra en Redis para que la limpieza explícita mande
const VIEW_ONCE_GRACE_MS = 20000; // tiempo real para leerlo antes de autodestruirse (20s)

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
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
    const toBurn = []; // mensajes de "una vista" cuyo margen de gracia ya pasó
    const toMarkRevealed = []; // mensajes de "una vista" que se entregan por primera vez ahora

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

      if (msg.viewOnce && msg.type !== "burned") {
        if (!msg.revealedAt) {
          // Primera vez que el destinatario (no quien lo envió) lo recibe:
          // arranca el conteo de gracia, pero todavía no se destruye.
          if (msg.from !== user) {
            toMarkRevealed.push(msg);
          }
        } else if (now - msg.revealedAt >= VIEW_ONCE_GRACE_MS) {
          toBurn.push(msg);
        }
      }
    }

    if (idsToRemove.length > 0) {
      await kv.zrem(INDEX_KEY, ...idsToRemove);
      await Promise.all(idsToRemove.map((id) => kv.del(`msg:${id}`)));
    }
    if (blobsToDelete.length > 0) {
      await Promise.all(blobsToDelete.map((url) => del(url).catch(() => {})));
    }
    if (toMarkRevealed.length > 0) {
      await Promise.all(
        toMarkRevealed.map(async (msg) => {
          const remainingMs = Math.max(0, (msg.expiresAt || now) - now);
          const remainingSec = Math.max(60, Math.floor(remainingMs / 1000));
          await kv.set(`msg:${msg.id}`, { ...msg, revealedAt: now }, { ex: remainingSec });
        })
      );
    }
    if (toBurn.length > 0) {
      await Promise.all(
        toBurn.map(async (msg) => {
          const remainingMs = Math.max(0, (msg.expiresAt || now) - now);
          const remainingSec = Math.max(60, Math.floor(remainingMs / 1000));
          await kv.set(
            `msg:${msg.id}`,
            {
              id: msg.id,
              from: msg.from,
              type: "burned",
              viewOnce: true,
              at: msg.at,
              expiresAt: msg.expiresAt,
            },
            { ex: remainingSec }
          );
          if (msg.url) await del(msg.url).catch(() => {});
        })
      );
    }

    messages.sort((a, b) => a.at - b.at);

    return NextResponse.json({ messages, you: user, ttlSeconds: TTL });
  } catch (error) {
    console.error("GET /api/messages", error);
    return NextResponse.json(
      { error: `error del servidor: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const type = body.type === "image" || body.type === "video" ? body.type : "text";
    const viewOnce = Boolean(body.viewOnce);

    let message;
    const id = randomUUID();
    const at = Date.now();
    const expiresAt = at + TTL * 1000;

    if (type === "text") {
      const text = (body.text || "").trim();
      if (!text) {
        return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });
      }
      message = { id, from: user, type, text: text.slice(0, 4000), viewOnce, at, expiresAt };
    } else {
      if (!body.url) {
        return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
      }
      message = { id, from: user, type, url: body.url, viewOnce, at, expiresAt };
    }

    await kv.set(`msg:${id}`, message, { ex: TTL + SAFETY_MARGIN });
    await kv.zadd(INDEX_KEY, { score: at, member: id });

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    console.error("POST /api/messages", error);
    return NextResponse.json(
      { error: `error del servidor: ${error.message}` },
      { status: 500 }
    );
  }
}
