import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "node:path";

const port = Number(process.env.AGENT_SERVICE_PORT ?? 50051);
const protoPath = path.resolve(__dirname, "../../../shared/proto/agent.proto");
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const agentService = (grpc.loadPackageDefinition(packageDefinition) as any).jarvis.agent.v1.AgentService;
const server = new grpc.Server();

// Phase 4 replaces this explicit stub with LangGraph command orchestration.
server.addService(agentService.service, { ProcessCommand: notImplemented });

server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
  if (error) throw error;
  console.log(`agent-service listening for gRPC on port ${port}`);
});

function notImplemented(_call: unknown, callback: grpc.sendUnaryData<unknown>): void {
  callback({ code: grpc.status.UNIMPLEMENTED, details: "Available in Phase 4." }, null);
}
