import { Router } from 'express';
import {
  listRooms,
  createRoom,
  getRoom,
  updateRoom,
  updateRoomStatus,
  getAvailableNow,
} from '../controllers/rooms';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/available/now', getAvailableNow);
router.get('/', listRooms);
router.post('/', requireRole(['ADMIN']), createRoom);
router.get('/:id', getRoom);
router.put('/:id', requireRole(['ADMIN']), updateRoom);
router.patch('/:id/status', requireRole(['ADMIN', 'FACULTY']), updateRoomStatus);

export default router;
