import { loadProtoPackage, grpc } from './protoLoader.js';

export function createAuthClient(address) {
    const proto = loadProtoPackage('auth/v1/auth.proto');
    return new proto.jarvis.auth.v1.AuthService(address, grpc.credentials.createInsecure(), {
        'grpc.keepalive_time_ms': 10000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': 1
    });
}