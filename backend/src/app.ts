import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import transactionRoutes from './routes/transactions.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

export default app;
