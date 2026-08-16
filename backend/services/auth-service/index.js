import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { config } from './src/config/index.js';
import { createAuthService } from './src/services/authService.js';
import { createHttpApp } from './src/http/routes.js';
import { startGrpcServer } from './src/grpc/server.js';

const app = express();
const authService = createAuthService();

app.use(cors());
app.use(express.json());
createHttpApp({ serviceName: config.serviceName, authService }).register(app);
startGrpcServer({ host: config.host, port: config.grpcPort, authService });

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ status: { ok: false, message: 'Internal server error' } });
});

app.listen(config.healthPort, config.host, () => {
    console.log(`[Auth Service] HTTP server running on http://${config.host}:${config.healthPort}`);
});