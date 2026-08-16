import { loadProtoPackage, grpc } from './protoLoader.js';
import { createAuthController } from '../controllers/authController.js';

export function startGrpcServer({ host, port, authService }) {
    const proto = loadProtoPackage('auth/v1/auth.proto');
    const server = new grpc.Server();

    server.addService(proto.jarvis.auth.v1.AuthService.service, createAuthController({ authService }));
    server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
        if (error) throw error;
        server.start();
        console.log(`[Auth Service] gRPC server running on ${host}:${boundPort}`);
    });

    return server;
}