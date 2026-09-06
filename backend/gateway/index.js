import express from 'express';
import cors from 'cors';
import http from 'node:http';
import Redis from 'ioredis';
import { WebSocketServer } from 'ws';
// Load environment variables from .env file
import './setup.js';

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
import { unary } from './src/grpc/unary.js';

const app = express();
const authClient = createAuthClient(config.authServiceUrl);
const agentClient = createAgentClient(config.agentServiceUrl);
const workerClient = createWorkerClient(config.workerServiceUrl);

const authMiddleware = createAuthMiddleware({ authClient });
const rateLimiter = createRateLimiter();
const strictRateLimiter = createStrictRateLimiter();

const httpAllowedOrigins = new Set((process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5000,http://127.0.0.1:5000').split(',').map((origin) => origin.trim()).filter(Boolean));
app.use(cors({ origin: (origin, callback) => callback(null, !origin || httpAllowedOrigins.has(origin) || origin.startsWith('chrome-extension://')) }));
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
app.use('/api/auth', createAuthRoutes(authController, rateLimiter, strictRateLimiter));
app.use('/agent', authMiddleware, createAgentRoutes(agentController, rateLimiter));
app.use('/api/agent', authMiddleware, createAgentRoutes(agentController, rateLimiter));
app.use('/worker', authMiddleware, createWorkerRoutes(workerController, rateLimiter));
app.use('/api/worker', authMiddleware, createWorkerRoutes(workerController, rateLimiter));
app.patch('/api/user/location', rateLimiter, authController.updateLocation);
app.use(errorHandler);

const server = http.createServer(app);
const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
const actionSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
const socketsByUser = new Map();
const MAX_CONNECTIONS_PER_USER = Number(process.env.WS_MAX_CONNECTIONS_PER_USER || 5);
const MAX_MESSAGES_PER_MINUTE = Number(process.env.WS_MAX_MESSAGES_PER_MINUTE || 60);
const allowedOrigins = new Set((process.env.WS_ALLOWED_ORIGINS || 'http://localhost:5000,http://localhost:8000').split(',').map((origin) => origin.trim()).filter(Boolean));
const allowedExtensionIds = new Set((process.env.WS_ALLOWED_EXTENSION_IDS || '').split(',').map((id) => id.trim()).filter(Boolean));

function isAllowedOrigin(origin) {
    if (!origin) return true;
    if (allowedOrigins.has(origin)) return true;
    if (!origin.startsWith('chrome-extension://')) return false;
    return allowedExtensionIds.size === 0 || allowedExtensionIds.has(origin.slice('chrome-extension://'.length));
}

actionSubscriber.on('message', (channel, message) => {
    const userId = channel.match(/^jarvis:browser:user:([^:]+):actions$/)?.[1];
    if (!userId) return;
    const sockets = socketsByUser.get(userId) || new Set();
    let action;
    try { action = JSON.parse(message).action; } catch { return; }
    for (const socket of sockets) {
        if (socket.readyState === 1 && (!action?.deviceId || socket.connectionInfo?.deviceId === action.deviceId)) {
            if (action?.actionId) socket.pendingActionIds.add(action.actionId);
            socket.send(message);
        }
    }
});

async function authenticateSocket(socket, rawToken) {
    const response = await unary(authClient, 'VerifyToken', { context: { requestId: `ws-${Date.now()}`, source: 'extension' }, accessToken: rawToken });
    if (!response.status?.ok || response.tokenStatus !== 'TOKEN_STATUS_VALID' || !response.userId) throw new Error('Invalid access token');
    return response.userId;
}

webSocketServer.on('connection', (socket) => {
    let userId = null;
    let authenticated = false;
    let connectionInfo = null;
    socket.pendingActionIds = new Set();
    const messageTimes = [];
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });
    const authTimer = setTimeout(() => { if (!authenticated) socket.close(1008, 'Authentication required'); }, 5000);

    socket.on('message', async (buffer) => {
        let message;
        try { message = JSON.parse(buffer.toString()); } catch { socket.close(1003, 'Invalid JSON'); return; }
        try {
            const now = Date.now();
            while (messageTimes[0] && messageTimes[0] <= now - 60_000) messageTimes.shift();
            if (messageTimes.length >= MAX_MESSAGES_PER_MINUTE) throw new Error('WebSocket message rate limit exceeded');
            messageTimes.push(now);
            if (!authenticated) {
                if (message.type !== 'AUTH' || !message.accessToken) throw new Error('Authentication required');
                userId = await authenticateSocket(socket, message.accessToken);
                const existing = socketsByUser.get(userId) || new Set();
                if (existing.size >= MAX_CONNECTIONS_PER_USER) throw new Error('Maximum extension connections reached');
                connectionInfo = {
                    deviceId: String(message.deviceId || '').slice(0, 128),
                    extensionVersion: String(message.extensionVersion || '').slice(0, 32),
                    tabId: Number.isInteger(message.tabId) ? message.tabId : null
                };
                socket.connectionInfo = connectionInfo;
                authenticated = true;
                clearTimeout(authTimer);
                if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
                socketsByUser.get(userId).add(socket);
                await actionSubscriber.subscribe(`jarvis:browser:user:${userId}:actions`);
                socket.send(JSON.stringify({ type: 'AUTHENTICATED', userId, deviceId: connectionInfo.deviceId }));
                return;
            }
            const allowedTypes = new Set(['ACTION_RESULT', 'CONFIRM', 'CANCEL']);
            if (!allowedTypes.has(message.type) || message.userId !== userId || !message.actionId) throw new Error('Invalid action response');
            socket.pendingActionIds.delete(message.actionId);
            const responsePublisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
            if (responsePublisher.status === 'wait') await responsePublisher.connect();
            await responsePublisher.publish(`jarvis:browser:user:${userId}:responses`, JSON.stringify(message));
            await responsePublisher.quit();
        } catch (error) {
            socket.send(JSON.stringify({ type: 'ACTION_REJECTED', actionId: message.actionId || '', message: error.message }));
        }
    });

    socket.on('close', () => {
        clearTimeout(authTimer);
        if (!userId) return;
        if (socket.pendingActionIds.size) {
            const publisher = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
            publisher.connect().then(async () => {
                for (const actionId of socket.pendingActionIds) await publisher.publish(`jarvis:browser:user:${userId}:responses`, JSON.stringify({ type: 'ACTION_TIMEOUT', actionId, userId, reason: 'Extension disconnected' }));
                await publisher.quit();
            }).catch(() => publisher.disconnect());
        }
        const sockets = socketsByUser.get(userId);
        sockets?.delete(socket);
        if (sockets?.size === 0) { socketsByUser.delete(userId); actionSubscriber.unsubscribe(`jarvis:browser:user:${userId}:actions`).catch(() => { }); }
    });
});

const wsHeartbeat = setInterval(() => {
    for (const sockets of socketsByUser.values()) {
        for (const socket of sockets) {
            if (!socket.isAlive) { socket.terminate(); continue; }
            socket.isAlive = false;
            socket.ping();
        }
    }
}, 30_000);
wsHeartbeat.unref();

server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    if (requestUrl.pathname !== '/ws/extension' || !isAllowedOrigin(request.headers.origin)) { socket.destroy(); return; }
    webSocketServer.handleUpgrade(request, socket, head, (client) => webSocketServer.emit('connection', client, request));
});

server.listen(config.port, config.host, () => {
    console.log(`[API Gateway] HTTP server running on http://${config.host}:${config.port}`);
});
