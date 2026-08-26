import { loadProtoPackage, grpc } from './protoLoader.js';

export function createWorkerClient(address) {
    const proto = loadProtoPackage('worker/v1/jobs.proto');
    return new proto.jarvis.worker.v1.WorkerJobService(address, grpc.credentials.createInsecure(), {
        'grpc.keepalive_time_ms': 10000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': 1
    });
}