import { createServer } from "node:http";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const serverEntryUrl = pathToFileURL(path.join(projectRoot, "dist/server/index.js")).href;

const port = Number(process.env.PORT ?? "8080");
const host = "0.0.0.0";

const runtimeEnv = {
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "",
};

let fetchHandlerPromise;

async function getFetchHandler() {
  if (!fetchHandlerPromise) {
    fetchHandlerPromise = import(serverEntryUrl).then((mod) => {
      const handler = mod?.default;
      if (!handler || typeof handler.fetch !== "function") {
        throw new Error("dist/server/index.js does not export a fetch handler");
      }
      return handler.fetch.bind(handler);
    });
  }
  return fetchHandlerPromise;
}

function toRequest(req) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const method = req.method ?? "GET";
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  const bodyAllowed = method !== "GET" && method !== "HEAD";
  const body = bodyAllowed ? Readable.toWeb(req) : undefined;

  return new Request(url, {
    method,
    headers,
    body,
    duplex: bodyAllowed ? "half" : undefined,
  });
}

async function writeResponse(res, response) {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    res.end();
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname === "/health") {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          ok: true,
          service: "pulseguard",
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    const fetchHandler = await getFetchHandler();
    const request = toRequest(req);
    const response = await fetchHandler(request, runtimeEnv, {});
    await writeResponse(res, response);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Internal Server Error" }));
  }
});

server.listen(port, host, () => {
  console.log(`Cloud Run server listening on http://${host}:${port}`);
});
