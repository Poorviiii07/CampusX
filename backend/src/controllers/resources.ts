import { Request, Response } from 'express';
import { z } from 'zod';
import { ExamType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { logAction } from '../services/audit';

const uploadSchema = z.object({
  title: z.string().min(1),
  subjectId: z.string().uuid().optional(),
  departmentId: z.string().uuid(),
  semester: z.number().int().min(1),
  academicYear: z.string().min(1),
  examType: z.nativeEnum(ExamType).optional(),
  regulation: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export async function uploadResource(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No file uploaded', 400);
    return;
  }

  // Parse numeric/boolean fields from form data
  const bodyParsed = {
    ...req.body,
    semester: req.body.semester ? parseInt(req.body.semester, 10) : undefined,
    isPublic: req.body.isPublic !== undefined ? req.body.isPublic === 'true' || req.body.isPublic === true : undefined,
  };

  const parsed = uploadSchema.safeParse(bodyParsed);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }

  const fileUrl = `/uploads/resources/${req.file.filename}`;
  const resource = await prisma.resource.create({
    data: {
      ...parsed.data,
      subjectId: parsed.data.subjectId ?? undefined,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedById: req.user!.id,
      isApproved: req.user!.role === 'ADMIN',
      examType: parsed.data.examType ?? 'OTHER',
    },
  });

  await logAction(req.user!.id, 'UPLOAD_RESOURCE', 'Resource', resource.id);
  sendSuccess(res, resource, 'Resource uploaded', 201);
}

export async function listResources(req: Request, res: Response): Promise<void> {
  const { subject_code, departmentId, semester, academicYear, examType } = req.query;
  const role = req.user!.role as Role;

  const where: Record<string, unknown> = {};
  if (role === 'STUDENT') {
    where.isApproved = true;
  }
  if (departmentId) where.departmentId = departmentId;
  if (semester) where.semester = parseInt(semester as string, 10);
  if (academicYear) where.academicYear = academicYear;
  if (examType) where.examType = examType;

  if (subject_code) {
    const code = (subject_code as string).trim();
    // Match subject by code containing query, or by name containing query,
    // or treat query as abbreviation (e.g. "CD" → Compiler Design via initials matching)
    const allSubjects = await prisma.subject.findMany({ select: { id: true, code: true, name: true } });
    const matchedSubjectIds = allSubjects
      .filter((s) => {
        const lcode = code.toLowerCase();
        // Direct substring match in code or name
        if (s.code.toLowerCase().includes(lcode) || s.name.toLowerCase().includes(lcode)) return true;
        // Abbreviation match: "CD" matches "Compiler Design" (first letters of each word)
        const initials = s.name
          .split(/\s+/)
          .map((w) => w[0]?.toUpperCase() ?? '')
          .join('');
        if (initials === code.toUpperCase()) return true;
        return false;
      })
      .map((s) => s.id);

    where.OR = [
      ...(matchedSubjectIds.length > 0 ? [{ subjectId: { in: matchedSubjectIds } }] : []),
      { title: { contains: code, mode: 'insensitive' as const } },
    ];
  }

  const resources = await prisma.resource.findMany({
    where: where as any,
    include: {
      subject: { select: { code: true, name: true } },
      uploadedBy: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, resources);
}

export async function downloadResource(req: Request, res: Response): Promise<void> {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!resource) { sendError(res, 'Resource not found', 404); return; }

  await prisma.resource.update({
    where: { id: req.params.id },
    data: { downloadCount: { increment: 1 } },
  });

  sendSuccess(res, { fileUrl: resource.fileUrl, fileName: resource.fileName });
}

export async function approveResource(req: Request, res: Response): Promise<void> {
  try {
    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { isApproved: true },
    });
    await logAction(req.user!.id, 'APPROVE_RESOURCE', 'Resource', resource.id);
    sendSuccess(res, resource);
  } catch {
    sendError(res, 'Resource not found', 404);
  }
}

export async function deleteResource(req: Request, res: Response): Promise<void> {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!resource) { sendError(res, 'Resource not found', 404); return; }

  if (resource.uploadedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    sendError(res, 'Forbidden', 403);
    return;
  }

  await prisma.resource.delete({ where: { id: req.params.id } });
  await logAction(req.user!.id, 'DELETE_RESOURCE', 'Resource', req.params.id);
  sendSuccess(res, null, 'Resource deleted');
}

export async function myResources(req: Request, res: Response): Promise<void> {
  const resources = await prisma.resource.findMany({
    where: { uploadedById: req.user!.id },
    include: { subject: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, resources);
}
