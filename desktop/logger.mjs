import fs from "node:fs";
import path from "node:path";

const MAX_LOG_BYTES = 1024 * 1024;

export function createDesktopLogger(logDir, { token } = {}) {
  fs.mkdirSync(logDir, { recursive: true });
  const file = path.join(logDir, "agentproof-desktop.log");
  rotate(file);
  return {
    file,
    info(message, meta) {
      append(file, "info", message, meta, token);
    },
    error(message, meta) {
      append(file, "error", message, meta, token);
    }
  };
}

function rotate(file) {
  if (!fs.existsSync(file)) return;
  if (fs.statSync(file).size <= MAX_LOG_BYTES) return;
  fs.rmSync(`${file}.1`, { force: true });
  fs.renameSync(file, `${file}.1`);
}

function append(file, level, message, meta, token) {
  const payload = { time: new Date().toISOString(), level, message, meta };
  fs.appendFileSync(file, `${redact(JSON.stringify(payload), token)}\n`, "utf8");
}

function redact(value, token) {
  let text = String(value ?? "");
  if (token) text = text.replaceAll(token, "[REDACTED_TOKEN]");
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/(token|cookie|password|secret|authorization|api[_-]?key)(["':= ]+)[^"',\s}]+/gi, "$1$2[REDACTED]");
}
