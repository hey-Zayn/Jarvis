export const config = {
    grpcPort: process.env.GRPC_PORT || process.env.PORT || 4002,
    healthPort: process.env.HEALTH_PORT || 4102,
    host: process.env.HOST || '0.0.0.0',
    serviceName: 'Agent service',
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB) || 0
    }
};
