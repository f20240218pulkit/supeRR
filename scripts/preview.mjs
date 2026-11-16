import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import handler from "../api/results.js";

const files = new Map([["/", ["index.html","text/html"]], ["/styles.css", ["styles.css","text/css"]],
  ["/dashboard.js", ["dashboard.js","text/javascript"]]]);
createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/api/results") {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (value) => { res.setHeader("Content-Type","application/json"); res.end(JSON.stringify(value)); };
    return handler(req,res);
  }
  const file = files.get(path);
  if (!file) { res.writeHead(404); res.end(); return; }
  res.writeHead(200,{"Content-Type":file[1]});
  res.end(await readFile(new URL(`../public/${file[0]}`, import.meta.url)));
}).listen(Number(process.env.PORT || 4173), "127.0.0.1", () => {
  process.stdout.write(`Local preview at http://127.0.0.1:${process.env.PORT || 4173}\n`);
});
