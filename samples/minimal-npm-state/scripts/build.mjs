import fs from "node:fs";

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("src/counter.mjs", "dist/counter.mjs");
fs.copyFileSync("src/server.mjs", "dist/server.mjs");
console.log("minimal-npm-state build ok");
