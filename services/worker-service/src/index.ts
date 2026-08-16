import { Worker } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379)
};

// The queue stays online now; Phase 5 adds the audit-log and embedding handlers.
const worker = new Worker("jarvis-bootstrap", async () => undefined, { connection });
worker.on("error", (error: Error) => console.error("worker-service error", error));

console.log(`worker-service connected to Redis at ${connection.host}:${connection.port}`);
