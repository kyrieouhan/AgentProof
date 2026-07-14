import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prismaCli = resolve(root, "node_modules", "prisma", "build", "index.js");
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || "file:./prisma/dev.db"
};

const child = spawn(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
