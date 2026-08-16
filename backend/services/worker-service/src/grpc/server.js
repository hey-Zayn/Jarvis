import { loadProtoPackage, grpc } from './protoLoader.js';
import { createWorkerJobController } from '../controllers/workerJobController.js';

export function startGrpcServer({ host, port }) {
    const proto = loadProtoPackage('worker/v1/jobs.proto');
    const server = new grpc.Server();

    server.addService(proto.jarvis.worker.v1.WorkerJobService.service, createWorkerJobController());
    server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
        if (error) {
            throw error;
        }

        server.start();
        console.log(`[Worker Service] gRPC server running on ${host}:${boundPort}`);
    });

    return server;
}