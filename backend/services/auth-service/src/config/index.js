export const config = {
    grpcPort: process.env.GRPC_PORT || process.env.PORT || 4001,
    healthPort: process.env.HEALTH_PORT || 4101,
    host: process.env.HOST || '0.0.0.0',
    serviceName: 'Auth service'
};