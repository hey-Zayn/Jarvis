import { loadProtoPackage, grpc } from './protoLoader.js';

export function createAuthClient(address) {
    const proto = loadProtoPackage('auth/v1/auth.proto');
    return new proto.jarvis.auth.v1.AuthService(address, grpc.credentials.createInsecure());
}