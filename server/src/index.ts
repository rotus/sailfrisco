import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import marineRouter from './routes/marine.js';
import tidesRouter from './routes/tides.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', marineRouter);
app.use('/api', tidesRouter);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sailfrisco-server' });
});

const port = Number(process.env.PORT) || 5174;
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});


