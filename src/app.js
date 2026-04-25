import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api/index.js';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173','https://ballerleague.onrender.com'],
}));
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'ballerleague-api' });
});

export default app;
