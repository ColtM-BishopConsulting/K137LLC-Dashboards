export const COOKIE_NAME = "auth_token";

const enc = new TextEncoder();
const subtle = globalThis.crypto?.subtle;

const toBase64Url = (bytes: Uint8Array) => {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

const fromBase64Url = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const fromStringToBytes = (str: string) => enc.encode(str);

const constantTimeEquals = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
};

const getSecret = () => {
  const secret = process.env.AUTH_SECRET || process.env.DATABASE_URL || "dev-secret";
  return secret;
};

const hmacSha256 = async (data: string, secret: string) => {
  if (!subtle) throw new Error("WebCrypto not available");
  const key = await subtle.importKey("raw", fromStringToBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await subtle.sign("HMAC", key, fromStringToBytes(data));
  return toBase64Url(new Uint8Array(sig));
};

const verifyToken = async (token: string) => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const expected = await hmacSha256(data, getSecret());
  const sigBytes = fromBase64Url(sig);
  const expBytes = fromBase64Url(expected);
  if (!constantTimeEquals(sigBytes, expBytes)) return null;
  const payloadBytes = fromBase64Url(body);
  const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
};

const parseCookieHeader = (cookieHeader: string | null | undefined) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(/;\s*/).reduce<Record<string, string>>((acc, part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return acc;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) acc[k] = decodeURIComponent(v || "");
    return acc;
  }, {});
};

export const getSessionFromCookieHeader = async (cookieHeader: string | null | undefined) => {
  const raw = (cookieHeader || "").trim();
  if (raw && !raw.includes("=") && raw.includes(".")) {
    return await verifyToken(raw);
  }
  if (raw.startsWith(`${COOKIE_NAME}=`)) {
    return await verifyToken(raw.slice(COOKIE_NAME.length + 1));
  }
  const parsed = parseCookieHeader(raw);
  const token = parsed[COOKIE_NAME];
  if (!token) return null;
  return await verifyToken(token);
};
