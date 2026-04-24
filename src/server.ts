import Fastify from "fastify";
import * as path from "path";
import * as fs from "fs";
import { mergeConfig, ConfigOptions } from "./config";
import { orchestrateScan } from "./core/index";

interface ScanBody {
  path: string;
  maxLines?: number;
  staleDays?: number;
  ignoreDeps?: string[];
}

const app = Fastify({ logger: true });

app.get("/health", async (_req, reply) => {
  return reply.send({ status: "ok" });
});

app.post<{ Body: ScanBody }>("/scan", {
  schema: {
    body: {
      type: "object",
      required: ["path"],
      properties: {
        path: { type: "string", minLength: 1 },
        maxLines: { type: "number", minimum: 1 },
        staleDays: { type: "number", minimum: 1 },
        ignoreDeps: { type: "array", items: { type: "string" } },
      },
    },
  },
}, async (request, reply) => {
  const body = request.body;

  // Resolve and validate the path — prevent directory traversal
  const resolvedDir = path.resolve(body.path);

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(resolvedDir);
  } catch {
    return reply.status(400).send({
      error: "Path does not exist or is not accessible",
      path: body.path,
    });
  }

  if (!stat.isDirectory()) {
    return reply.status(400).send({
      error: "Path is not a directory",
      path: body.path,
    });
  }

  const overrides: Partial<ConfigOptions> = {};
  if (typeof body.maxLines === "number") overrides.largeFileLines = body.maxLines;
  if (typeof body.staleDays === "number") overrides.staleFileDays = body.staleDays;
  if (Array.isArray(body.ignoreDeps)) overrides.ignoreDeps = body.ignoreDeps;

  const config = mergeConfig(overrides);

  try {
    const result = await orchestrateScan(resolvedDir, config);
    return reply.send(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return reply.status(500).send({ error: "Scan failed", details: message });
  }
});

const port = parseInt(process.env.PORT ?? "3000", 10);

app.listen({ port, host: "127.0.0.1" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
