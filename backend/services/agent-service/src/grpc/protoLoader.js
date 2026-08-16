import fs from 'fs';
import path from 'path';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

function resolveProtoRoot() {
    const candidates = [
        process.env.PROTO_ROOT,
        path.resolve(process.cwd(), '../../shared/proto'),
        path.resolve(process.cwd(), '../../../shared/proto'),
        '/shared/proto'
    ].filter(Boolean);

    const protoRoot = candidates.find((candidate) => fs.existsSync(candidate));

    if (!protoRoot) {
        throw new Error(`Unable to resolve proto root from: ${candidates.join(', ')}`);
    }

    return protoRoot;
}

const protoRoot = resolveProtoRoot();

const loaderOptions = {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [protoRoot]
};

export function loadProtoPackage(relativePath) {
    const packageDefinition = protoLoader.loadSync(path.join(protoRoot, relativePath), loaderOptions);
    return grpc.loadPackageDefinition(packageDefinition);
}

export { grpc };