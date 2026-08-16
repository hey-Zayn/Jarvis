import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import proxy from 'express-http-proxy';


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'API Gateway' });
});
app.get('/', (req, res) => {
    res.json({
        message: "Gateway service is working",
        PORT
    })
});


app.use("/auth", proxy("http://auth-service:4001"));
app.use("/agent", proxy("http://agent-service:4002"));
app.use("/worker", proxy("http://worker-service:4003"));


const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';





app.listen(PORT, HOST, () => {
    console.log(`[API Gateway] REST Server running on http://${HOST}:${PORT}`);
});