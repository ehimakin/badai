import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

function getEncryptionKey() {
  const raw = process.env.TWO_FA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Missing TWO_FA_ENCRYPTION_KEY");
  }

  const fromBase64 = Buffer.from(raw, "base64");
  if (fromBase64.length === 32 && fromBase64.toString("base64") === raw) {
    return fromBase64;
  }

  return crypto.createHash("sha256").update(raw).digest();
}

function base32Encode(input: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input: string) {
  const sanitized = input.replace(/=+$/g, "").replace(/[\s-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of sanitized) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error("Invalid base32 secret");
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

function hotp(secret: string, counter: number) {
  const secretBytes = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function createTwoFASecret() {
  return base32Encode(crypto.randomBytes(20));
}

export function createOtpAuthUrl(secret: string, email: string) {
  const issuer = encodeURIComponent("BDAIA");
  const label = encodeURIComponent(`BDAIA:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

export function verifyTotpCode(secret: string, code: string, now = Date.now()) {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (let drift = -1; drift <= 1; drift += 1) {
    if (hotp(secret, counter + drift) === normalized) return true;
  }
  return false;
}

export function encryptTwoFASecret(secret: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptTwoFASecret(payload: string) {
  const [ivB64, ciphertextB64, tagB64] = payload.split(".");
  if (!ivB64 || !ciphertextB64 || !tagB64) {
    throw new Error("Invalid 2FA secret payload");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function randomRecoveryCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function generateRecoveryCodes(count = 10) {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(randomRecoveryCode());
  }
  return [...codes];
}

export function normalizeRecoveryCode(code: string) {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export function hashRecoveryCode(code: string) {
  return crypto.createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}
