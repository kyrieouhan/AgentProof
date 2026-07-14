#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { domainJsonSchemas } from "../src/domain/schemas.mjs";

const repoRoot = path.resolve(process.argv.includes("--repo-root") ? process.argv[process.argv.indexOf("--repo-root") + 1] : ".");
const outputDir = path.join(repoRoot, "schemas", "domain");
fs.mkdirSync(outputDir, { recursive: true });

for (const [fileName, schema] of Object.entries(domainJsonSchemas())) {
  fs.writeFileSync(path.join(outputDir, fileName), `${JSON.stringify(schema, null, 2)}\n`);
}

console.log(JSON.stringify({ status: "passed", outputDir: path.relative(repoRoot, outputDir), schemaCount: Object.keys(domainJsonSchemas()).length }, null, 2));
