import crypto from "node:crypto";

export function generateDataSourceApiKey() {
  return `ds_live_${crypto.randomUUID().replace(/-/g, "")}`;
}
