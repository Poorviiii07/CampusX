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

// Timetable PDF upload (stored for reference, not parsed automatically)
const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const fs = require('fs');
      const dir = 'uploads/timetables';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const { v4: uuidv4 } = require('uuid');
      const ext = file.originalname.split('.').pop();
      cb(null, `${uuidv4()}.${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    cb(null, allowed.includes(file.mimetype));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post('/upload-pdf', requireRole(['ADMIN']), pdfUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const { semesterId, semester, section, department, academicYear, notes } = req.body;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    // Store PDF metadata in AuditLog for now (no separate model needed)
    await prisma.auditLog.create({
      data: {
        userId: (req as any).user.id,
        action: 'TIMETABLE_PDF_UPLOAD',
        entityType: 'TimetablePDF',
        entityId: req.file.filename,
        details: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileUrl: `/uploads/timetables/${req.file.filename}`,
          semesterId, semester, section, department, academicYear, notes,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    await prisma.$disconnect();
    res.json({
      success: true,
      message: 'Timetable PDF uploaded successfully',
      data: {
        fileUrl: `/uploads/timetables/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

router.get('/pdfs', requireRole(['ADMIN', 'FACULTY']), async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const logs = await prisma.auditLog.findMany({
      where: { action: 'TIMETABLE_PDF_UPLOAD' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    await prisma.$disconnect();
    const pdfs = logs.map((l: any) => {
      try { return { id: l.id, createdAt: l.createdAt, ...(typeof l.details === 'object' && l.details !== null ? l.details as Record<string, unknown> : {}) }; }
      catch { return { id: l.id, createdAt: l.createdAt }; }
    });
    res.json({ success: true, data: pdfs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch PDFs' });
  }
});
