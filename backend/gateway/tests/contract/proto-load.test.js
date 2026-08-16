import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthClient } from '../../src/grpc/authClient.js';
import { createAgentClient } from '../../src/grpc/agentClient.js';
import { createWorkerClient } from '../../src/grpc/workerClient.js';
import { loadProtoPackage } from '../../src/grpc/protoLoader.js';

test('loads all Phase 1 proto packages', () => {
    const authProto = loadProtoPackage('auth/v1/auth.proto');
    const agentProto = loadProtoPackage('agent/v1/agent.proto');
    const workerProto = loadProtoPackage('worker/v1/jobs.proto');

    assert.ok(authProto.jarvis.auth.v1.AuthService);
    assert.ok(agentProto.jarvis.agent.v1.AgentService);
    assert.ok(workerProto.jarvis.worker.v1.WorkerJobService);
});

test('creates gateway gRPC clients from generated service definitions', () => {
    assert.ok(createAuthClient('localhost:4001'));
    assert.ok(createAgentClient('localhost:4002'));
    assert.ok(createWorkerClient('localhost:4003'));
});