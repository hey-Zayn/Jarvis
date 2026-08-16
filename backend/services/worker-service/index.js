import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './src/config/index.js';
import { createHttpApp } from './src/http/routes.js';
import { startGrpcServer } from './src/grpc/server.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

createHttpApp({ serviceName: config.serviceName }).register(app);
startGrpcServer({ host: config.host, port: config.grpcPort });

app.listen(config.healthPort, config.host, () => {
    console.log(`[Worker Service] HTTP health server running on http://${config.host}:${config.healthPort}`);
});