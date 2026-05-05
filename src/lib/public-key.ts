import crypto from "node:crypto";

export function generatePublicKey() {
  return `pk_live_${crypto.randomUUID().replace(/-/g, "")}`;
}
