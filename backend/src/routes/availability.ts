import { Router, Request, Response } from 'express';
import { RoomType } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { findAvailableRooms, findCurrentlyAvailableRooms, isClassFree } from '../services/availability';

const router = Router();

router.use(authenticateToken);

router.get('/rooms', async (req: Request, res: Response): Promise<void> => {
  const { date, period, capacity, type, building_id, equipment } = req.query;

  if (!period) {
    sendError(res, 'period is required', 400);
    return;
  }

  const parsedDate = date ? new Date(date as string) : new Date();
  const parsedPeriod = parseInt(period as string, 10);

  if (isNaN(parsedPeriod) || parsedPeriod < 1 || parsedPeriod > 8) {
    sendError(res, 'period must be 1-8', 400);
    return;
  }

  const equipmentArr = equipment
    ? (equipment as string).split(',').map((e) => e.trim()).filter(Boolean)
    : undefined;

  const rooms = await findAvailableRooms({
    date: parsedDate,
    period: parsedPeriod,
    capacity: capacity ? parseInt(capacity as string, 10) : undefined,
    type: type ? (type as RoomType) : undefined,
    buildingId: building_id as string | undefined,
    equipment: equipmentArr,
  });

  sendSuccess(res, rooms);
});

router.get('/now', async (_req: Request, res: Response): Promise<void> => {
  const rooms = await findCurrentlyAvailableRooms();
  sendSuccess(res, rooms);
});

router.get('/class', async (req: Request, res: Response): Promise<void> => {
  const { class_id, period, date } = req.query;
  if (!class_id || !period) {
    sendError(res, 'class_id and period are required', 400);
    return;
  }
  const parsedDate = date ? new Date(date as string) : new Date();
  const parsedPeriod = parseInt(period as string, 10);
  const free = await isClassFree(class_id as string, parsedPeriod, parsedDate);
  sendSuccess(res, { isFree: free });
});

export default router;
