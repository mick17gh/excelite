import bcrypt from "bcryptjs";

const CREDENTIAL_PREFIX = "v2";
const PIN_RE = /^\d{4}$/;

type CredentialParts = {
  passwordHash: string;
  pinHash?: string | null;
};

export function isValidFourDigitPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

export function encodeCredentialPassword(parts: CredentialParts): string {
  const payload: CredentialParts = {
    passwordHash: parts.passwordHash,
    pinHash: parts.pinHash ?? null,
  };
  return `${CREDENTIAL_PREFIX}:${JSON.stringify(payload)}`;
}

export function decodeCredentialPassword(stored: string): CredentialParts | null {
  if (!stored.startsWith(`${CREDENTIAL_PREFIX}:`)) {
    return null;
  }

  const raw = stored.slice(CREDENTIAL_PREFIX.length + 1);
  try {
    const parsed = JSON.parse(raw) as CredentialParts;
    if (!parsed.passwordHash || typeof parsed.passwordHash !== "string") {
      return null;
    }
    return {
      passwordHash: parsed.passwordHash,
      pinHash: parsed.pinHash ?? null,
    };
  } catch {
    return null;
  }
}

export async function verifyCredentialPassword(input: string, stored: string): Promise<boolean> {
  const parsed = decodeCredentialPassword(stored);
  if (!parsed) {
    return bcrypt.compare(input, stored);
  }

  if (await bcrypt.compare(input, parsed.passwordHash)) {
    return true;
  }

  if (parsed.pinHash && (await bcrypt.compare(input, parsed.pinHash))) {
    return true;
  }

  return false;
}
