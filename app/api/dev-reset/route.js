import { NextResponse } from "next/server";
import kv from "@/lib/kv";
import { del } from "@vercel/blob";

export async function POST() {
  if (process.env.DEV_MODE !== "true") {
    return NextResponse.json(
      { error: "Reinicio deshabilitado (DEV_MODE no está activo)." },
      { status: 403 }
    );
  }

  await kv.del("welcome:response");
  await kv.del("lastSeen:A");
  await kv.del("lastSeen:B");

  const ids = (await kv.zrange("messages:index", 0, -1)) || [];
  if (ids.length > 0) {
    const keys = ids.map((id) => `msg:${id}`);
    const raw = await kv.mget(...keys);
    const urls = raw.filter(Boolean).map((m) => m.url).filter(Boolean);
    await Promise.all(urls.map((url) => del(url).catch(() => {})));
    await Promise.all(keys.map((k) => kv.del(k)));
  }
  await kv.del("messages:index");

  return NextResponse.json({ ok: true });
}
