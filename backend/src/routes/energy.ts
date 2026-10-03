import { Router } from 'express';
import { bulkInsertRecords, getEnergyData, getAnomalies, getEnergySummary } from '../controllers/energy';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/records', requireRole(['ADMIN']), bulkInsertRecords);
router.get('/data', requireRole(['ADMIN']), getEnergyData);
router.get('/anomalies', requireRole(['ADMIN']), getAnomalies);
router.get('/summary', requireRole(['ADMIN']), getEnergySummary);

export default router;
