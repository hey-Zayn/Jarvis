import dotenv from 'dotenv';
// Load environment variables without logging secrets or overriding deployment
// configuration. Docker uses /shared/proto, while local development resolves
// the relative PROTO_ROOT from the gateway working directory.
dotenv.config();

export const config = {
    port: process.env.PORT || 5000,
    host: process.env.HOST || '0.0.0.0',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'auth-service:4001',
    agentServiceUrl: process.env.AGENT_SERVICE_URL || 'agent-service:4002',
    workerServiceUrl: process.env.WORKER_SERVICE_URL || 'worker-service:4003'
};
