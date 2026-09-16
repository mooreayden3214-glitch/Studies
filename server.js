import dotenv from "dotenv";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import { join } from "node:path";
import { createServer, ServerResponse } from "node:http";
import { logging, server as wisp } from "@mercuryworkshop/wisp-js/server";
import { createBareServer } from "@tomphttp/bare-server-node";
import { MasqrMiddleware } from "./masqr.js";

dotenv.config();

ServerResponse.prototype.setMaxListeners(50);

const port = process.env.PORT || 2345;

const server = createServer();

const bare =
  process.env.BARE !== "false"
    ? createBareServer("/seal/")
    : null;

logging.set_level(logging.NONE);

Object.assign(wisp.options, {
  dns_method: "resolve",
  dns_servers: ["1.1.1.3", "1.0.0.3"],
  dns_result_order: "ipv4first",
});

server.on("upgrade", (req, sock, head) =>
  bare?.shouldRoute(req)
    ? bare.routeUpgrade(req, sock, head)
    : req.url.endsWith("/wisp/")
      ? wisp.routeRequest(req, sock, head)
      : sock.end()
);

const app = Fastify({
  serverFactory: (h) =>
    (
      server.on("request", (req, res) =>
        bare?.shouldRoute(req)
          ? bare.routeRequest(req, res)
          : h(req, res)
      ),
      server
    ),

  logger: false,
  keepAliveTimeout: 30000,
  connectionTimeout: 60000,
  forceCloseConnections: true,
});

await app.register(fastifyCookie);

app.register(fastifyStatic, {
  root: join(import.meta.dirname, "dist"),
  prefix: "/",
  decorateReply: true,
  maxAge: 86400000,
  immutable: true,
  cacheControl: true,
  etag: true,
  lastModified: true,
});

if (process.env.MASQR === "true") {
  app.addHook("onRequest", MasqrMiddleware);
}

const proxy =
  (url, type = "application/javascript") =>
  async (req, reply) => {
    try {
      const res = await fetch(url(req));

      if (!res.ok) {
        return reply.code(res.status).send();
      }

      if (res.headers.get("content-type")) {
        reply.type(res.headers.get("content-type"));
      } else {
        reply.type(type);
      }

      return reply.send(
        Buffer.from(await res.arrayBuffer())
      );
    } catch {
      return reply.code(500).send();
    }
  };

app.get(
  "/js/script.js",
  proxy(() => "https://byod.privatedns.org/js/script.js")
);

app.get("/return", async (req, reply) =>
  req.query?.q
    ? fetch(
        `https://duckduckgo.com/ac/?q=${encodeURIComponent(
          req.query.q
        )}`
      )
        .then((r) => r.json())
        .catch(() =>
          reply
            .code(500)
            .send({ error: "request failed" })
        )
    : reply
        .code(401)
        .send({ error: "query parameter?" })
);

app.setNotFoundHandler((req, reply) =>
  req.raw.method === "GET" &&
  req.headers.accept?.includes("text/html")
    ? reply.sendFile("pages/index.html")
    : reply.code(404).send({ error: "Not Found" })
);

/*
 * Railway requires the server to listen on
 * 0.0.0.0 so it can receive incoming connections.
 */
app
  .listen({
    port,
    host: "0.0.0.0",
  })
  .then(() =>
    console.log(
      `Server running on ${port}`
    )
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
