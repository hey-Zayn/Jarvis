import path from 'path';
import { fileURLToPath } from 'url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_ROOT = path.resolve(__dirname, '../../proto');

const loaderOptions = {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_ROOT]
};

export function getProtoPath(relativePath) {
    return path.join(PROTO_ROOT, relativePath);
}

export function loadProtoPackage(relativePath) {
    const packageDefinition = protoLoader.loadSync(getProtoPath(relativePath), loaderOptions);
    return grpc.loadPackageDefinition(packageDefinition);
}

export { grpc };