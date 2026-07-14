import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const initDb = resolve(root, "scripts", "init-db.mjs");
const vitestCli = resolve(root, "node_modules", "vitest", "vitest.mjs");
const env = {
  ...process.env,
  DATABASE_URL: "file:./prisma/test.db"
};

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: false
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(process.execPath, [initDb, "--reset"]);
run(process.execPath, [vitestCli, "run", "--pool=forks"]);

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  rmSync(resolve(root, "prisma", `test.db${suffix}`), { force: true });
}
