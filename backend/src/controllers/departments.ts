import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';

const deptSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  hodId: z.string().uuid().optional(),
});

export async function listDepartments(_req: Request, res: Response): Promise<void> {
  const departments = await prisma.department.findMany({
    include: {
      hod: { select: { id: true, name: true, email: true } },
      _count: { select: { subjects: true, classes: true } },
    },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, departments);
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  const parsed = deptSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const dept = await prisma.department.create({ data: parsed.data as any });
  sendSuccess(res, dept, 'Department created', 201);
}

export async function getDepartment(req: Request, res: Response): Promise<void> {
  const dept = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: {
      subjects: true,
      hod: { select: { id: true, name: true, email: true } },
      _count: { select: { classes: true } },
    },
  });
  if (!dept) { sendError(res, 'Department not found', 404); return; }
  sendSuccess(res, dept);
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  const parsed = deptSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  try {
    const dept = await prisma.department.update({
      where: { id: req.params.id },
      data: parsed.data as any,
    });
    sendSuccess(res, dept);
  } catch {
    sendError(res, 'Department not found', 404);
  }
}
