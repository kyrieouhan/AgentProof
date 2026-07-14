import fs from "node:fs";
import path from "node:path";

export function prepareOfficialDemo({ appRoot, dataRoot, version, logger } = {}) {
  const source = path.join(appRoot, "samples", "demo-web-app");
  const target = path.join(dataRoot, "demo", version);
  const marker = path.join(target, ".agentproof-demo-version");
  if (!fs.existsSync(source)) throw new Error(`Official demo source not found: ${source}`);
  if (fs.existsSync(marker)) return target;

  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) {
    logger?.info("Official demo copy already exists; preserving user changes.", { target });
    return target;
  }

  const temp = `${target}.tmp-${Date.now().toString(36)}`;
  fs.cpSync(source, temp, { recursive: true, filter: copyFilter });
  rewriteRunnerProfile(temp);
  fs.writeFileSync(path.join(temp, ".agentproof-demo-version"), `${version}\n`, "utf8");
  fs.renameSync(temp, target);
  logger?.info("Official demo copied to user data directory.", { target });
  return target;
}

function copyFilter(sourcePath) {
  const name = path.basename(sourcePath);
  if ([".git", "dist", "coverage"].includes(name)) return false;
  if (/\.(db|sqlite|sqlite3)$/i.test(name)) return false;
  return true;
}

function rewriteRunnerProfile(demoRoot) {
  const file = path.join(demoRoot, "agentproof.runner-profile.json");
  const profile = JSON.parse(fs.readFileSync(file, "utf8"));
  profile.repo_path = ".";
  profile.commit = "desktop-demo";
  fs.writeFileSync(file, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
}
