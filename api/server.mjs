/*
  Fortera AI relay: lets the published site use Ollama Cloud models without
  exposing the API key to the browser. It speaks the same /api/* shape as a
  local Ollama, so the site's client code does not change.

  Env: OLLAMA_API_KEY (required for AI), ALLOW_ORIGINS (comma list), PORT.
  Only a short allowlist of free-tier models is exposed, output length is
  capped and each IP gets a modest request budget.
*/
import http from "node:http";

const KEY = process.env.OLLAMA_API_KEY || "";
const UPSTREAM = "https://ollama.com";
const PORT = Number(process.env.PORT || 10000);
const ORIGINS = (process.env.ALLOW_ORIGINS || "https://fortera-16k9.onrender.com,https://vulnex-00v9.onrender.com,http://localhost:5190")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// only models verified to return proper Russian JSON through the cloud API (2026-11-05)
const MODELS = ["gemma4:31b", "gpt-oss:120b"];
const MAX_BODY = 200_000;
const MAX_TOKENS = 1400;

// per-IP budget: 40 AI requests per 10 minutes
const hits = new Map();
function allowed(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 600_000);
  if (list.length >= 40) return false;
  list.push(now);
  hits.set(ip, list);
  return true;
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
}

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  const url = new URL(req.url, "http://x");
  const path = url.pathname.replace(/^\/ollama/, "");

  if (path === "/" || path === "/health") return json(res, 200, { ok: true, ai: Boolean(KEY) });
  if (path === "/api/version") return json(res, 200, { version: "cloud" });
  if (path === "/api/ps") return json(res, 200, { models: [] });
  if (path === "/api/generate") return json(res, 200, {}); // "warm-up": cloud models need none

  if (!KEY) return json(res, 503, { error: "ИИ-сервер не настроен: не задан OLLAMA_API_KEY" });

  if (path === "/api/tags" && req.method === "GET") {
    try {
      const r = await fetch(`${UPSTREAM}/api/tags`, { headers: { Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(15000) });
      const data = await r.json();
      const models = (data.models || []).filter((m) => MODELS.includes(m.name)).sort((a, b) => MODELS.indexOf(a.name) - MODELS.indexOf(b.name));
      return json(res, 200, { models });
    } catch {
      return json(res, 200, { models: MODELS.map((name) => ({ name, size: 0 })) });
    }
  }

  if (path === "/api/chat" && req.method === "POST") {
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString().split(",")[0].trim();
    if (!allowed(ip)) return json(res, 429, { error: "Слишком много запросов, попробуйте через несколько минут" });
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, { error: "bad request" });
    }
    if (!MODELS.includes(body.model)) return json(res, 400, { error: `модель недоступна: ${body.model}` });
    const payload = {
      model: body.model,
      messages: Array.isArray(body.messages) ? body.messages.slice(-12) : [],
      stream: body.stream !== false,
      format: body.format,
      options: { ...(body.options || {}), num_predict: Math.min(Number(body.options?.num_predict) || 900, MAX_TOKENS) },
    };
    try {
      const up = await fetch(`${UPSTREAM}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180000),
      });
      res.writeHead(up.status, { "Content-Type": up.headers.get("content-type") || "application/x-ndjson", "Cache-Control": "no-store" });
      if (!up.body) return res.end();
      const reader = up.body.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(value);
      }
      return res.end();
    } catch (e) {
      if (!res.headersSent) return json(res, 502, { error: "облачная модель не ответила" });
      return res.end();
    }
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`fortera ai relay on :${PORT}, key ${KEY ? "set" : "MISSING"}`));
