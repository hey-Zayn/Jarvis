export const config = {
    grpcPort: process.env.GRPC_PORT || process.env.PORT || 4003,
    healthPort: process.env.HEALTH_PORT || 4103,
    host: process.env.HOST || '0.0.0.0',
    serviceName: 'Worker service'
};