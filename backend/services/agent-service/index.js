import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.json({
        message: "Agent service is running"
    })
})

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Agent service'
    })
})

const PORT = process.env.PORT || 4002;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`[Agent Service] Server running on http://${HOST}:${PORT}`);
})