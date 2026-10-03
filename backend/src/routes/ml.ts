import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticateToken, requireRole } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

router.get('/demand-forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const resp = await axios.post(`${ML_URL}/ml/predict/demand`, req.query);
    sendSuccess(res, resp.data);
  } catch (err: any) {
    sendError(res, `ML service error: ${err.message}`, 502);
  }
});

router.get('/energy-forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const resp = await axios.post(`${ML_URL}/ml/predict/energy`, req.query);
    sendSuccess(res, resp.data);
  } catch (err: any) {
    sendError(res, `ML service error: ${err.message}`, 502);
  }
});

router.get('/maintenance-forecast', async (req: Request, res: Response): Promise<void> => {
  try {
    const resp = await axios.post(`${ML_URL}/ml/predict/maintenance`, req.query);
    sendSuccess(res, resp.data);
  } catch (err: any) {
    sendError(res, `ML service error: ${err.message}`, 502);
  }
});

export default router;
