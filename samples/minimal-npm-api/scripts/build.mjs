import fs from "node:fs";

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("src/app.mjs", "dist/app.mjs");
fs.copyFileSync("src/server.mjs", "dist/server.mjs");
console.log("minimal-npm-api build ok");
