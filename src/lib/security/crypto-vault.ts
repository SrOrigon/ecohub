import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const SALT_LEN = 16;
const PBKDF2_ITERATIONS = 10000;

function getMasterKeySecret(): string {
  return (
    process.env.PAYMENT_ENCRYPTION_KEY?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "ecohub-master-payment-vault-secret-key-32chars!"
  );
}

function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterSecret,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LEN,
    "sha256"
  );
}

/**
 * Criptografa dados sensíveis de credenciais/API usando AES-256-GCM.
 */
export function encryptSecret(text: string): string {
  if (!text) return "";

  const masterSecret = getMasterKeySecret();
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(masterSecret, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${salt.toString("hex")}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Descriptografa texto cifrado retornado pelo vault.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText) return "";

  const parts = cipherText.split(":");
  if (parts.length !== 4) {
    throw new Error("Formato de texto cifrado inválido.");
  }

  const [saltHex, ivHex, tagHex, encryptedHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const masterSecret = getMasterKeySecret();
  const key = deriveKey(masterSecret, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
