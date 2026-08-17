import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './src/config/index.js';
import { createAuthClient } from './src/grpc/authClient.js';
import { createAgentClient } from './src/grpc/agentClient.js';
import { createWorkerClient } from './src/grpc/workerClient.js';
import { createAuthController } from './src/controllers/authController.js';
import { createAgentController } from './src/controllers/agentController.js';
import { createWorkerController } from './src/controllers/workerController.js';
import {
    createAuthRoutes,
    createAgentRoutes,
    createWorkerRoutes,
    errorHandler
} from './src/routes/index.js';
import { createRateLimiter, createStrictRateLimiter } from './src/middlewares/rateLimiter.js';
import { createAuthMiddleware } from './src/middlewares/authMiddleware.js';

dotenv.config();

const app = express();
const authClient = createAuthClient(config.authServiceUrl);
const agentClient = createAgentClient(config.agentServiceUrl);
const workerClient = createWorkerClient(config.workerServiceUrl);

const authMiddleware = createAuthMiddleware({ authClient });
const rateLimiter = createRateLimiter();
const strictRateLimiter = createStrictRateLimiter();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'API Gateway' });
});

app.get('/', (req, res) => {
    res.json({ message: 'Gateway service is working', port: config.port });
});

const authController = createAuthController({ authClient });
const agentController = createAgentController({ agentClient });
const workerController = createWorkerController({ workerClient });

app.use('/auth', createAuthRoutes(authController, rateLimiter, strictRateLimiter));
app.use('/agent', authMiddleware, createAgentRoutes(agentController, rateLimiter));
app.use('/worker', authMiddleware, createWorkerRoutes(workerController, rateLimiter));
app.use(errorHandler);

app.listen(config.port, config.host, () => {
    console.log(`[API Gateway] HTTP server running on http://${config.host}:${config.port}`);
});