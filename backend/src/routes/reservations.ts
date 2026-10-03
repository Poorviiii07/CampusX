import { Router } from 'express';
import {
  createReservation,
  listReservations,
  myReservations,
  cancelReservation,
  updateReservationStatus,
} from '../controllers/reservations';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/', requireRole(['ADMIN', 'FACULTY']), createReservation);
router.get('/', listReservations);
router.get('/my', myReservations);
router.delete('/:id', cancelReservation);
router.patch('/:id/status', requireRole(['ADMIN']), updateReservationStatus);

export default router;
