import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { sendError } from './utils/response';

// Routes
import authRoutes from './routes/auth';
import buildingRoutes from './routes/buildings';
import roomRoutes from './routes/rooms';
import departmentRoutes from './routes/departments';
import timetableRoutes from './routes/timetable';
import availabilityRoutes from './routes/availability';
import reservationRoutes from './routes/reservations';
import resourceRoutes from './routes/resources';
import complaintRoutes from './routes/complaints';
import aiRoutes from './routes/ai';
import analyticsRoutes from './routes/analytics';
import optimizationRoutes from './routes/optimization';
import simulationRoutes from './routes/simulation';
import energyRoutes from './routes/energy';
import reportRoutes from './routes/reports';
import mlRoutes from './routes/ml';

const app = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'CAMPUS-X Backend', version: '1.0.0' });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/optimization', optimizationRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ml', mlRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  sendError(res, 'Route not found', 404);
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  sendError(res, 'Internal server error', 500);
});

export default app;
