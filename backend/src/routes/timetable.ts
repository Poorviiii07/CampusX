import { Router } from 'express';
import multer from 'multer';
import {
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  importCSV,
  listConflicts,
  listClasses,
  createClass,
  listSemesters,
  createSemester,
  listSubjects,
  createSubject,
} from '../controllers/timetable';
import { authenticateToken, requireRole } from '../middleware/auth';

const csvUpload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(authenticateToken);

// Timetable entries
router.get('/entries', listEntries);
router.post('/entries', requireRole(['ADMIN']), createEntry);
router.put('/entries/:id', requireRole(['ADMIN']), updateEntry);
router.delete('/entries/:id', requireRole(['ADMIN']), deleteEntry);
router.post('/import', requireRole(['ADMIN']), csvUpload.single('file'), importCSV);
router.get('/conflicts', requireRole(['ADMIN']), listConflicts);

// Classes
router.get('/classes', listClasses);
router.post('/classes', requireRole(['ADMIN']), createClass);

// Semesters
router.get('/semesters', listSemesters);
router.post('/semesters', requireRole(['ADMIN']), createSemester);

// Subjects
router.get('/subjects', listSubjects);
router.post('/subjects', requireRole(['ADMIN']), createSubject);

export default router;
