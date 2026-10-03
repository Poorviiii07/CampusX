import { Router } from 'express';
import {
  uploadResource,
  listResources,
  downloadResource,
  approveResource,
  deleteResource,
  myResources,
} from '../controllers/resources';
import { authenticateToken, requireRole } from '../middleware/auth';
import { resourceUpload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.get('/my', myResources);
router.post('/upload', requireRole(['ADMIN', 'FACULTY']), resourceUpload.single('file'), uploadResource);
router.get('/', listResources);
router.get('/:id/download', downloadResource);
router.patch('/:id/approve', requireRole(['ADMIN']), approveResource);
router.delete('/:id', deleteResource);

export default router;
