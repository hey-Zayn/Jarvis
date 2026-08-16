import { loadProtoPackage, grpc } from './protoLoader.js';

export function createAgentClient(address) {
    const proto = loadProtoPackage('agent/v1/agent.proto');
    return new proto.jarvis.agent.v1.AgentService(address, grpc.credentials.createInsecure());
}