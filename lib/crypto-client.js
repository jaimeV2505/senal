// Todo esto corre en el navegador de cada persona. La frase de cifrado
// nunca se manda al servidor: solo el resultado ya cifrado. El servidor
// (y quien tenga acceso a la base de datos) ve puro texto ininteligible.

const SALT = new TextEncoder().encode("senal-fixed-salt-v1");
const STORAGE_KEY = "senal_enc_passphrase";

export function getSavedPassphrase() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function savePassphrase(passphrase) {
  window.localStorage.setItem(STORAGE_KEY, passphrase);
}

export function clearPassphrase() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function deriveKey(passphrase) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: 150000, hash: "SHA-256" },
    keyMaterial,
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
