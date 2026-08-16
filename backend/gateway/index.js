import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import proxy from 'express-http-proxy';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'auth-service:4001';
const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'agent-service:4002';
const WORKER_SERVICE_URL = process.env.WORKER_SERVICE_URL || 'worker-service:4003';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'API Gateway' });
});

app.get('/', (req, res) => {
    res.json({
        message: 'Gateway service is working',
        port: PORT
    });
});

app.use('/auth', proxy(`http://${AUTH_SERVICE_URL}`));
app.use('/agent', proxy(`http://${AGENT_SERVICE_URL}`));
app.use('/worker', proxy(`http://${WORKER_SERVICE_URL}`));

app.listen(PORT, HOST, () => {
    console.log(`[API Gateway] REST Server running on http://${HOST}:${PORT}`);
});