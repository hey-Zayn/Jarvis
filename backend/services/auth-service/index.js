import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.json({
        message: "Auth service is running"
    })
})

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Auth service'
    })
})

const PORT = process.env.PORT || 4001;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`[Auth Service] Server running on http://${HOST}:${PORT}`);
})