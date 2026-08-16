export const config = {
    grpcPort: process.env.GRPC_PORT || process.env.PORT || 4002,
    healthPort: process.env.HEALTH_PORT || 4102,
    host: process.env.HOST || '0.0.0.0',
    serviceName: 'Agent service'
};