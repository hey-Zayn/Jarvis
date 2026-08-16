import { loadProtoPackage, grpc } from './protoLoader.js';
import { createAgentController } from '../controllers/agentController.js';

export function startGrpcServer({ host, port }) {
    const proto = loadProtoPackage('agent/v1/agent.proto');
    const server = new grpc.Server();

    server.addService(proto.jarvis.agent.v1.AgentService.service, createAgentController());
    server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
        if (error) {
            throw error;
        }

        server.start();
        console.log(`[Agent Service] gRPC server running on ${host}:${boundPort}`);
    });

    return server;
}