import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "node:path";

const port = Number(process.env.AUTH_SERVICE_PORT ?? 50052);
const protoPath = path.resolve(__dirname, "../../../shared/proto/auth.proto");
const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const authService = (grpc.loadPackageDefinition(packageDefinition) as any).jarvis.auth.v1.AuthService;
const server = new grpc.Server();

// Phase 2 replaces these explicit stubs with register, login, and JWT logic.
server.addService(authService.service, {
  Register: notImplemented,
  Login: notImplemented,
  VerifyToken: notImplemented
});

server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
  if (error) throw error;
  console.log(`auth-service listening for gRPC on port ${port}`);
});

function notImplemented(_call: unknown, callback: grpc.sendUnaryData<unknown>): void {
  callback({ code: grpc.status.UNIMPLEMENTED, details: "Available in Phase 2." }, null);
}
