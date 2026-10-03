import { Router } from 'express';
import {
  listBuildings,
  createBuilding,
  getBuilding,
  updateBuilding,
  deleteBuilding,
  uploadBlueprint,
  listFloors,
  createFloor,
} from '../controllers/buildings';
import { authenticateToken, requireRole } from '../middleware/auth';
import { blueprintUpload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.get('/', listBuildings);
router.post('/', requireRole(['ADMIN']), createBuilding);
router.get('/:id', getBuilding);
router.put('/:id', requireRole(['ADMIN']), updateBuilding);
router.delete('/:id', requireRole(['ADMIN']), deleteBuilding);
router.post('/:id/blueprint', requireRole(['ADMIN']), blueprintUpload.single('file'), uploadBlueprint);

router.get('/:buildingId/floors', listFloors);
router.post('/:buildingId/floors', requireRole(['ADMIN']), createFloor);

export default router;
