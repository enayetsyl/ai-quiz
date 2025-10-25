import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import pino from 'pino';
import pinoHttp from 'pino-http';

const logger = pino({
	level: process.env.LOG_LEVEL ?? 'info'
});

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

// simple health endpoint
app.get('/healthz', (req, res) => {
	res.json({ status: 'ok' });
});

// example router placeholder
app.get('/', (req, res) => {
	res.json({ message: 'Quiz Tuition API' });
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: 'Not Found' });
});

export default app;
