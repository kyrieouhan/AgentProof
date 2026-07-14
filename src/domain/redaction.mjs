const SENSITIVE_KEY = /(authorization|cookie|set-cookie|password|token|secret|api[_-]?key)/i;

export function redactSensitive(value) {
  const redactedPaths = [];
  const redacted = redactNode(value, [], redactedPaths);
  return {
    value: redacted,
    summary: {
      redacted_count: redactedPaths.length,
      redacted_paths: redactedPaths
    }
  };
}

function redactNode(value, path, redactedPaths) {
  if (Array.isArray(value)) return value.map((entry, index) => redactNode(entry, [...path, String(index)], redactedPaths));
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    const nextPath = [...path, key];
    if (SENSITIVE_KEY.test(key)) {
      redactedPaths.push(nextPath.join("."));
      return [key, "[REDACTED]"];
    }
    return [key, redactNode(entry, nextPath, redactedPaths)];
  }));
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
