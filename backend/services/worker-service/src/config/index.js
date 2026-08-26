export const config = {
    grpcPort: process.env.GRPC_PORT || process.env.PORT || 4003,
    healthPort: process.env.HEALTH_PORT || 4103,
    host: process.env.HOST || '0.0.0.0',
    serviceName: 'Worker service',
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB) || 0
    }
};
