// Cada persona genera su propio par de llaves en su navegador. La llave
// PRIVADA nunca sale de ahí (se guarda solo en localStorage, de ese
// dispositivo). Solo la llave PÚBLICA se sube al servidor — una llave
// pública no es un secreto, es literalmente para eso que existe.
//
// Cuando las dos personas tienen la llave pública de la otra, cada una,
// por su cuenta, combina su propia llave privada con la pública de la otra
// (Diffie-Hellman sobre curva elíptica) y las dos llegan exactamente a la
// misma llave de cifrado — sin que ninguna la haya mandado nunca.

function storageKey(user) {
  return `senal_ecdh_${user}`;
}

export function hasLocalKeypair(user) {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(storageKey(user)));
}

export async function loadOrCreateKeypair(user) {
  const saved = window.localStorage.getItem(storageKey(user));
  if (saved) {
    const { privateJwk, publicJwk } = JSON.parse(saved);
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey"]
    );
    return { privateKey, publicJwk, isNew: false };
  }

  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

  window.localStorage.setItem(
    storageKey(user),
    JSON.stringify({ privateJwk, publicJwk })
  );

  return { privateKey: pair.privateKey, publicJwk, isNew: true };
}

export function resetLocalKeypair(user) {
  window.localStorage.removeItem(storageKey(user));
}

export async function deriveSharedKey(myPrivateKey, otherPublicJwk) {
  const otherPublicKey = await crypto.subtle.importKey(
    "jwk",
    otherPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: otherPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return { ciphertext: bufToBase64(buf), iv: bufToBase64(iv) };
}

export async function decryptText(key, ciphertextB64, ivB64) {
  const iv = base64ToBuf(ivB64);
  const data = base64ToBuf(ciphertextB64);
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(buf);
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
