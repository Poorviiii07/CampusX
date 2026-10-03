import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

function makeStorage(dest: string) {
  return multer.diskStorage({
    destination: path.join(__dirname, '../../uploads', dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, uuidv4() + ext);
    },
  });
}

// Blueprint upload: PNG, JPEG, PDF — max 10 MB
export const blueprintUpload = multer({
  storage: makeStorage('blueprints'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Blueprint: only PNG, JPEG, PDF allowed'));
    }
  },
});

// Resource upload: pdf, doc, docx, ppt, pptx, zip, png, jpg — max 50 MB
export const resourceUpload = multer({
  storage: makeStorage('resources'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed',
      'image/png',
      'image/jpeg',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Resource: unsupported file type'));
    }
  },
});

// Complaint image upload: images only — max 5 MB
export const complaintImageUpload = multer({
  storage: makeStorage('complaints'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Complaint: only images allowed'));
    }
  },
});
