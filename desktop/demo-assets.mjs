import fs from "node:fs";
import path from "node:path";

export function prepareOfficialDemo({ appRoot, dataRoot, version, logger } = {}) {
  const source = path.join(appRoot, "samples", "demo-web-app");
  const target = path.join(dataRoot, "demo", version);
  const marker = path.join(target, ".vericrate-demo-version");
  if (!fs.existsSync(source)) throw new Error(`Official demo source not found: ${source}`);
  if (fs.existsSync(marker)) return target;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    logger?.info("Official demo copy already exists; preserving user changes.", { target });
    return target;
  }

  const temp = `${target}.tmp-${Date.now().toString(36)}`;
  fs.cpSync(source, temp, { recursive: true, filter: sourcePath => copyFilter(source, sourcePath) });
  rewriteRunnerProfile(temp);
  repairPnpmNodeModules(temp);
  fs.writeFileSync(path.join(temp, ".vericrate-demo-version"), `${version}\n`, "utf8");
  fs.renameSync(temp, target);
  logger?.info("Official demo copied to user data directory.", { target });
  return target;
}

function copyFilter(root, sourcePath) {
  const name = path.basename(sourcePath);
  const relative = path.relative(root, sourcePath);
  if ([".git", "coverage"].includes(name)) return false;
  if (relative === "dist") return false;
  if (/\.(db|sqlite|sqlite3)$/i.test(name)) return false;
  return true;
}

function rewriteRunnerProfile(demoRoot) {
  const file = path.join(demoRoot, "vericrate.runner-profile.json");
  const profile = JSON.parse(fs.readFileSync(file, "utf8"));
  profile.repo_path = ".";
  profile.commit = "desktop-demo";
  fs.writeFileSync(file, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
}

function repairPnpmNodeModules(demoRoot) {
  const rootNodeModules = path.join(demoRoot, "node_modules");
  const store = path.join(rootNodeModules, ".pnpm");
  if (!fs.existsSync(store)) return;
  for (const entry of fs.readdirSync(store)) {
    const nested = path.join(store, entry, "node_modules");
    if (!fs.existsSync(nested)) continue;
    for (const name of fs.readdirSync(nested)) {
      if (name.startsWith(".") && name !== ".prisma") continue;
      if (name.startsWith("@")) {
        for (const scoped of fs.readdirSync(path.join(nested, name))) {
          ensurePackageLink(path.join(nested, name, scoped), path.join(rootNodeModules, name, scoped));
        }
      } else {
        ensurePackageLink(path.join(nested, name), path.join(rootNodeModules, name));
      }
    }
  }
}

function ensurePackageLink(source, target) {
  if (fs.existsSync(target)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}
