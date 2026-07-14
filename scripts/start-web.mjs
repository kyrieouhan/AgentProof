#!/usr/bin/env node
import { startWebServer } from "../src/web/server.mjs";

const args = process.argv.slice(2);
const port = valueAfter("--port") ?? process.env.PORT ?? "4173";
const host = valueAfter("--host") ?? process.env.HOST ?? "127.0.0.1";

const app = await startWebServer({ host, port: Number(port), repoRoot: process.cwd() });
console.log(`AgentProof local Web UI listening on ${app.url}`);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
