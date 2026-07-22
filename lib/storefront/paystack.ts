import crypto from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";

function getEncryptionKey(): Buffer {
  const raw = process.env.STOREFRONT_SECRET_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    return crypto.createHash("sha256").update("excelite-default-dev-key").digest();
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTION_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(ENCRYPTION_PREFIX)) return value;

  const payload = value.substring(ENCRYPTION_PREFIX.length);
  const [ivPart, tagPart, encryptedPart] = payload.split(":");
  if (!ivPart || !tagPart || !encryptedPart) return null;

  const iv = Buffer.from(ivPart, "base64");
  const authTag = Buffer.from(tagPart, "base64");
  const encrypted = Buffer.from(encryptedPart, "base64");
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
