import http from "node:http";
import { greeting } from "./app.mjs";

const port = Number(process.env.PORT ?? 3101);

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === "/greet") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ message: greeting(url.searchParams.get("name")) }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`minimal-npm-api listening on ${port}`);
});
