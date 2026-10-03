import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { getOverview, getUtilization, getComplaintAnalytics, getAlerts } from '../services/analytics';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/overview', async (_req: Request, res: Response): Promise<void> => {
  const data = await getOverview();
  sendSuccess(res, data);
});

router.get('/utilization', async (_req: Request, res: Response): Promise<void> => {
  const data = await getUtilization();
  sendSuccess(res, data);
});

router.get('/complaints', async (_req: Request, res: Response): Promise<void> => {
  const data = await getComplaintAnalytics();
  sendSuccess(res, data);
});

router.get('/alerts', async (_req: Request, res: Response): Promise<void> => {
  const data = await getAlerts();
  sendSuccess(res, data);
});

export default router;
