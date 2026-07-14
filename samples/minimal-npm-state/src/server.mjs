import http from "node:http";
import { createCounter } from "./counter.mjs";

const port = Number(process.env.PORT ?? 3102);
const counter = createCounter();

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === "/count") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ count: counter.increment() }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`minimal-npm-state listening on ${port}`);
});
