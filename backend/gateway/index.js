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
import { createAuthRoutes } from './src/http/authRoutes.js';
import { createAgentRoutes } from './src/http/agentRoutes.js';
import { createWorkerRoutes } from './src/http/workerRoutes.js';
import { errorHandler } from './src/http/errorHandler.js';

dotenv.config();

const app = express();
const authClient = createAuthClient(config.authServiceUrl);
const agentClient = createAgentClient(config.agentServiceUrl);
const workerClient = createWorkerClient(config.workerServiceUrl);

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'API Gateway' });
});

app.get('/', (req, res) => {
    res.json({ message: 'Gateway service is working', port: config.port });
});

app.use('/auth', createAuthRoutes(createAuthController({ authClient })));
app.use('/agent', createAgentRoutes(createAgentController({ agentClient })));
app.use('/worker', createWorkerRoutes(createWorkerController({ workerClient })));
app.use(errorHandler);

app.listen(config.port, config.host, () => {
    console.log(`[API Gateway] HTTP server running on http://${config.host}:${config.port}`);
});