import { loadProtoPackage, grpc } from './protoLoader.js';

export function createAgentClient(address) {
    const proto = loadProtoPackage('agent/v1/agent.proto');
    return new proto.jarvis.agent.v1.AgentService(address, grpc.credentials.createInsecure(), {
        'grpc.keepalive_time_ms': 10000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': 1
    });
}