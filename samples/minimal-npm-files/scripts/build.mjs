import fs from "node:fs";

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("src/manifest.mjs", "dist/manifest.mjs");
fs.copyFileSync("src/server.mjs", "dist/server.mjs");
console.log("minimal-npm-files build ok");
