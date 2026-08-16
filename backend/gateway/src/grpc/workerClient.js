import { loadProtoPackage, grpc } from './protoLoader.js';

export function createWorkerClient(address) {
    const proto = loadProtoPackage('worker/v1/jobs.proto');
    return new proto.jarvis.worker.v1.WorkerJobService(address, grpc.credentials.createInsecure());
}