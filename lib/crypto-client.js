import { x25519 } from "@noble/curves/ed25519";

// Cada persona escribe SU PROPIA frase (nunca la del otro, nunca se
// comparten entre ustedes). Esa frase, siempre que la vuelvas a escribir
// igual, genera exactamente la misma llave privada — así que si cambias de
// dispositivo o borras el navegador, con volver a escribirla recuperas tu
// misma llave. La frase en sí nunca sale de tu navegador ni se manda al
// servidor; solo la llave PÚBLICA derivada de ella se sube, y una llave
// pública no es un secreto.

function storageKey(user) {
  return `senal_passphrase_${user}`;
}

export function getSavedPassphrase(user) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(user));
}

export function savePassphrase(user, passphrase) {
  window.localStorage.setItem(storageKey(user), passphrase);
}

export function clearPassphrase(user) {
  window.localStorage.removeItem(storageKey(user));
}

// PBKDF2 (nativo del navegador) convierte tu frase en 32 bytes deterministas
// que sirven de llave privada X25519. Misma frase, siempre la misma llave.
async function passphraseToSeed(passphrase) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode("senal-x25519-v1"), iterations: 200000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

export async function deriveKeypairFromPassphrase(passphrase) {
  const privateKey = await passphraseToSeed(passphrase);
  const publicKey = x25519.getPublicKey(privateKey);
  return { privateKey, publicKeyB64: bufToBase64(publicKey) };
}

export async function deriveSharedKey(myPrivateKey, otherPublicKeyB64) {
  const otherPublicKey = base64ToBytes(otherPublicKeyB64);
  const sharedSecret = x25519.getSharedSecret(myPrivateKey, otherPublicKey);
  // Un hash extra sobre el secreto compartido antes de usarlo como llave
  // AES (buena práctica estándar, evita usar el resultado del ECDH crudo).
  const hashed = await crypto.subtle.digest("SHA-256", sharedSecret);
  return crypto.subtle.importKey("raw", hashed, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
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
  const iv = base64ToBytes(ivB64);
  const data = base64ToBytes(ciphertextB64);
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(buf);
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
