import { Request, Response } from 'express';
import { z } from 'zod';
import { ComplaintCategory, ComplaintPriority, ComplaintStatus, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { logAction } from '../services/audit';

const complaintSchema = z.object({
  category: z.nativeEnum(ComplaintCategory),
  buildingId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  description: z.string().min(5),
  priority: z.nativeEnum(ComplaintPriority).optional(),
});

async function generateAutoId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.complaint.count();
  const seq = String(count + 1).padStart(3, '0');
  return `CMP-${year}-${seq}`;
}

export async function createComplaint(req: Request, res: Response): Promise<void> {
  const parsed = complaintSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }

  const autoId = await generateAutoId();
  const imageUrl = req.file ? `/uploads/complaints/${req.file.filename}` : undefined;

  const complaint = await prisma.complaint.create({
    data: {
      ...parsed.data,
      autoId,
      reporterId: req.user!.id,
      imageUrl,
      buildingId: parsed.data.buildingId ?? undefined,
      floorId: parsed.data.floorId ?? undefined,
      roomId: parsed.data.roomId ?? undefined,
      priority: parsed.data.priority ?? 'MEDIUM',
    },
    include: {
      reporter: { select: { name: true, email: true, role: true } },
      building: { select: { name: true } },
      room: { select: { code: true, name: true } },
    },
  });

  await logAction(req.user!.id, 'CREATE_COMPLAINT', 'Complaint', complaint.id);
  sendSuccess(res, complaint, 'Complaint registered', 201);
}

export async function listComplaints(req: Request, res: Response): Promise<void> {
  const role = req.user!.role as Role;
  const { status, category, buildingId } = req.query;

  const where: Record<string, unknown> = {};

  if (role === 'STUDENT') {
    where.reporterId = req.user!.id;
  } else if (role === 'FACULTY') {
    // Faculty sees complaints from their dept building - simplified: own + assigned
    where.OR = [
      { reporterId: req.user!.id },
      { assignedToId: req.user!.id },
    ];
  }
  // ADMIN sees all

  if (status) where.status = status;
  if (category) where.category = category;
  if (buildingId) where.buildingId = buildingId;

  const complaints = await prisma.complaint.findMany({
    where: where as any,
    include: {
      reporter: { select: { name: true, email: true, role: true } },
      assignedTo: { select: { name: true, email: true } },
      building: { select: { name: true } },
      room: { select: { code: true, name: true } },
      _count: { select: { updates: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, complaints);
}

export async function getComplaint(req: Request, res: Response): Promise<void> {
  const complaint = await prisma.complaint.findUnique({
    where: { id: req.params.id },
    include: {
      reporter: { select: { name: true, email: true, role: true } },
      assignedTo: { select: { name: true, email: true } },
      building: { select: { name: true } },
      floor: { select: { name: true, floorNumber: true } },
      room: { select: { code: true, name: true } },
      updates: {
        include: { updatedBy: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!complaint) { sendError(res, 'Complaint not found', 404); return; }
  sendSuccess(res, complaint);
}

export async function assignComplaint(req: Request, res: Response): Promise<void> {
  const { assignedToId } = req.body;
  if (!assignedToId) { sendError(res, 'assignedToId required', 400); return; }
  try {
    const complaint = await prisma.complaint.update({
      where: { id: req.params.id },
      data: { assignedToId, status: 'ASSIGNED' },
    });
    await prisma.complaintUpdate.create({
      data: {
        complaintId: complaint.id,
        updatedById: req.user!.id,
        message: `Assigned to user`,
        statusChange: 'ASSIGNED',
      },
    });
    sendSuccess(res, complaint);
  } catch {
    sendError(res, 'Complaint not found', 404);
  }
}

export async function updateComplaintStatus(req: Request, res: Response): Promise<void> {
  const { status, message, resolution } = req.body;
  if (!status) { sendError(res, 'status required', 400); return; }

  try {
    const complaint = await prisma.complaint.update({
      where: { id: req.params.id },
      data: {
        status: status as ComplaintStatus,
        resolution: resolution ?? undefined,
      },
    });
    await prisma.complaintUpdate.create({
      data: {
        complaintId: complaint.id,
        updatedById: req.user!.id,
        message: message ?? `Status updated to ${status}`,
        statusChange: status as ComplaintStatus,
      },
    });
    await logAction(req.user!.id, 'UPDATE_COMPLAINT_STATUS', 'Complaint', complaint.id, { status });
    sendSuccess(res, complaint);
  } catch {
    sendError(res, 'Complaint not found', 404);
  }
}

export async function getComplaintStats(_req: Request, res: Response): Promise<void> {
  const [byStatus, byCategory, byBuilding] = await Promise.all([
    prisma.complaint.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.complaint.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.complaint.groupBy({
      by: ['buildingId'],
      _count: { _all: true },
      where: { buildingId: { not: null } },
    }),
  ]);

  sendSuccess(res, { byStatus, byCategory, byBuilding });
}
