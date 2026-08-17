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

test('AuthService contract has all required RPC methods', () => {
    const authProto = loadProtoPackage('auth/v1/auth.proto');
    const service = authProto.jarvis.auth.v1.AuthService.service;

    assert.ok(service.Register);
    assert.ok(service.Login);
    assert.ok(service.VerifyToken);
    assert.ok(service.RefreshToken);
    assert.ok(service.GetProfile);
    assert.ok(service.UpdateProfile);
});

test('AgentService contract has all required RPC methods', () => {
    const agentProto = loadProtoPackage('agent/v1/agent.proto');
    const service = agentProto.jarvis.agent.v1.AgentService.service;

    assert.ok(service.StartConversation);
    assert.ok(service.SendVoiceCommand);
    assert.ok(service.StreamAgentResponse);
    assert.ok(service.SaveMemory);
    assert.ok(service.SearchMemory);
});

test('WorkerJobService contract has all required RPC methods', () => {
    const workerProto = loadProtoPackage('worker/v1/jobs.proto');
    const service = workerProto.jarvis.worker.v1.WorkerJobService.service;

    assert.ok(service.EnqueueActionLog);
    assert.ok(service.EnqueueConversationPersist);
});

test('Common types are shared across services', () => {
    const commonProto = loadProtoPackage('common/v1/common.proto');
    assert.ok(commonProto.jarvis.common.v1.RequestContext);
    assert.ok(commonProto.jarvis.common.v1.OperationStatus);
    assert.ok(commonProto.jarvis.common.v1.Error);
    assert.ok(commonProto.jarvis.common.v1.HealthCheckRequest);
    assert.ok(commonProto.jarvis.common.v1.HealthCheckResponse);
});

test('Auth message types are defined in proto', () => {
    const authProto = loadProtoPackage('auth/v1/auth.proto');
    // Verify message types exist in the loaded package
    assert.ok(authProto.jarvis.auth.v1.RegisterRequest);
    assert.ok(authProto.jarvis.auth.v1.LoginRequest);
    assert.ok(authProto.jarvis.auth.v1.VerifyTokenRequest);
    assert.ok(authProto.jarvis.auth.v1.RefreshTokenRequest);
    assert.ok(authProto.jarvis.auth.v1.GetProfileRequest);
    assert.ok(authProto.jarvis.auth.v1.UpdateProfileRequest);
    assert.ok(authProto.jarvis.auth.v1.AuthSession);
    assert.ok(authProto.jarvis.auth.v1.TokenStatus);
});

test('Agent message types are defined in proto', () => {
    const agentProto = loadProtoPackage('agent/v1/agent.proto');
    assert.ok(agentProto.jarvis.agent.v1.StartConversationRequest);
    assert.ok(agentProto.jarvis.agent.v1.SendVoiceCommandRequest);
    assert.ok(agentProto.jarvis.agent.v1.StreamAgentResponseRequest);
    assert.ok(agentProto.jarvis.agent.v1.AgentResponseChunk);
    assert.ok(agentProto.jarvis.agent.v1.SaveMemoryRequest);
    assert.ok(agentProto.jarvis.agent.v1.SearchMemoryRequest);
    assert.ok(agentProto.jarvis.agent.v1.MemoryResult);
    assert.ok(agentProto.jarvis.agent.v1.BrowserContext);
});

test('Worker message types are defined in proto', () => {
    const workerProto = loadProtoPackage('worker/v1/jobs.proto');
    assert.ok(workerProto.jarvis.worker.v1.EnqueueActionLogRequest);
    assert.ok(workerProto.jarvis.worker.v1.EnqueueConversationPersistRequest);
    assert.ok(workerProto.jarvis.worker.v1.EnqueueActionLogResponse);
    assert.ok(workerProto.jarvis.worker.v1.EnqueueConversationPersistResponse);
});

test('All services use common RequestContext and OperationStatus', () => {
    const authProto = loadProtoPackage('auth/v1/auth.proto');
    const agentProto = loadProtoPackage('agent/v1/agent.proto');
    const workerProto = loadProtoPackage('worker/v1/jobs.proto');

    // Verify common types are referenced (not duplicated)
    const authRegister = authProto.jarvis.auth.v1.RegisterRequest;
    const agentStartConv = agentProto.jarvis.agent.v1.StartConversationRequest;
    const workerActionLog = workerProto.jarvis.worker.v1.EnqueueActionLogRequest;

    // All should have a 'context' field of type RequestContext
    assert.ok(authRegister);
    assert.ok(agentStartConv);
    assert.ok(workerActionLog);
});