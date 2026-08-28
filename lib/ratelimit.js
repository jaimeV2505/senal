import kv from "@/lib/kv";

const WINDOW_SECONDS = 15 * 60; // 15 minutos
const MAX_ATTEMPTS = 8;

export function getClientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Devuelve { blocked: bool, count: number }. Cuenta el intento actual.
export async function checkRateLimit(scope, ip) {
  const key = `ratelimit:${scope}:${ip}`;
  const count = await kv.incr(key);
  if (count === 1) {
    await kv.expire(key, WINDOW_SECONDS);
  }
  return { blocked: count > MAX_ATTEMPTS, count };
}

export async function clearRateLimit(scope, ip) {
  await kv.del(`ratelimit:${scope}:${ip}`).catch(() => {});
}

export { MAX_ATTEMPTS };
