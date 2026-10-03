import { Router } from 'express';
import {
  createComplaint,
  listComplaints,
  getComplaint,
  assignComplaint,
  updateComplaintStatus,
  getComplaintStats,
} from '../controllers/complaints';
import { authenticateToken, requireRole } from '../middleware/auth';
import { complaintImageUpload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.get('/stats', requireRole(['ADMIN']), getComplaintStats);
router.post('/', complaintImageUpload.single('image'), createComplaint);
router.get('/', listComplaints);
router.get('/:id', getComplaint);
router.patch('/:id/assign', requireRole(['ADMIN']), assignComplaint);
router.patch('/:id/status', requireRole(['ADMIN', 'FACULTY']), updateComplaintStatus);

export default router;
