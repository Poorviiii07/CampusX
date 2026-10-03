import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { classifyIntent, queryDB } from '../services/ai-copilot';

const router = Router();

router.use(authenticateToken);

router.post('/query', async (req: Request, res: Response): Promise<void> => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    sendError(res, 'query string required', 400);
    return;
  }

  const intent = classifyIntent(query);
  const result = await queryDB(intent, query, req.user!.role);

  sendSuccess(res, { intent, response: result.message, data: result.data });
});

export default router;
