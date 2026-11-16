import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../dist/index.html", import.meta.url));
const port = Number(process.env.PORT || 4173);
createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path !== "/" && path !== "/index.html") {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store"}).end(page);
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`Local preview at http://127.0.0.1:${port}\n`);
});
