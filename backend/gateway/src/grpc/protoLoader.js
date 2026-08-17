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

    console.log('protoLoader.js: process.cwd() =', process.cwd());
    console.log('protoLoader.js: process.env.PROTO_ROOT =', process.env.PROTO_ROOT);
    console.log('protoLoader.js: candidates =', candidates);

    const protoRoot = candidates.find((candidate) => {
        const exists = fs.existsSync(candidate);
        console.log(`protoLoader.js: Checking ${candidate} -> ${exists}`);
        return exists;
    });

    if (!protoRoot) {
        throw new Error(`Unable to resolve proto root from: ${candidates.join(', ')}`);
    }

    console.log('protoLoader.js: Selected protoRoot =', protoRoot);
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