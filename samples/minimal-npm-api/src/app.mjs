export function greeting(name) {
  const normalized = String(name ?? "").trim() || "agent";
  return `hello, ${normalized.toLowerCase()}`;
}
