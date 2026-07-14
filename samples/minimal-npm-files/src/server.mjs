import http from "node:http";
import { manifest } from "./manifest.mjs";

const port = Number(process.env.PORT ?? 3103);

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === "/manifest") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ files: manifest([" beta.txt ", "alpha.txt"]) }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`minimal-npm-files listening on ${port}`);
});
