import { Router } from 'express';
import { listDepartments, createDepartment, getDepartment, updateDepartment } from '../controllers/departments';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listDepartments);
router.post('/', requireRole(['ADMIN']), createDepartment);
router.get('/:id', getDepartment);
router.put('/:id', requireRole(['ADMIN']), updateDepartment);

export default router;
