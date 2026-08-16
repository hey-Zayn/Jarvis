export const config = {
    port: process.env.PORT || 5000,
    host: process.env.HOST || '0.0.0.0',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'auth-service:4001',
    agentServiceUrl: process.env.AGENT_SERVICE_URL || 'agent-service:4002',
    workerServiceUrl: process.env.WORKER_SERVICE_URL || 'worker-service:4003'
};