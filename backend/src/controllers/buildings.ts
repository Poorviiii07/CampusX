import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { logAction } from '../services/audit';

const buildingSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  totalFloors: z.number().int().positive().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

const floorSchema = z.object({
  floorNumber: z.number().int().min(0),
  name: z.string().min(1),
});

export async function listBuildings(req: Request, res: Response): Promise<void> {
  const buildings = await prisma.building.findMany({
    where: { isActive: true },
    include: { _count: { select: { floors: true, rooms: true } } },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, buildings);
}

export async function createBuilding(req: Request, res: Response): Promise<void> {
  const parsed = buildingSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const building = await prisma.building.create({ data: parsed.data });
  await logAction(req.user!.id, 'CREATE_BUILDING', 'Building', building.id);
  sendSuccess(res, building, 'Building created', 201);
}

export async function getBuilding(req: Request, res: Response): Promise<void> {
  const building = await prisma.building.findUnique({
    where: { id: req.params.id },
    include: {
      floors: { include: { rooms: true }, orderBy: { floorNumber: 'asc' } },
    },
  });
  if (!building) { sendError(res, 'Building not found', 404); return; }
  sendSuccess(res, building);
}

export async function updateBuilding(req: Request, res: Response): Promise<void> {
  const parsed = buildingSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  try {
    const building = await prisma.building.update({ where: { id: req.params.id }, data: parsed.data });
    await logAction(req.user!.id, 'UPDATE_BUILDING', 'Building', building.id);
    sendSuccess(res, building);
  } catch {
    sendError(res, 'Building not found', 404);
  }
}

export async function deleteBuilding(req: Request, res: Response): Promise<void> {
  try {
    const building = await prisma.building.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    await logAction(req.user!.id, 'DELETE_BUILDING', 'Building', building.id);
    sendSuccess(res, null, 'Building deactivated');
  } catch {
    sendError(res, 'Building not found', 404);
  }
}

export async function uploadBlueprint(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No file uploaded', 400);
    return;
  }
  const { floorId } = req.body;
  if (!floorId) {
    sendError(res, 'floorId required', 400);
    return;
  }
  const fileUrl = `/uploads/blueprints/${req.file.filename}`;
  const floor = await prisma.floor.update({
    where: { id: floorId },
    data: { blueprintUrl: fileUrl },
  });
  sendSuccess(res, { floor, fileUrl });
}

export async function listFloors(req: Request, res: Response): Promise<void> {
  const floors = await prisma.floor.findMany({
    where: { buildingId: req.params.buildingId },
    include: { _count: { select: { rooms: true } } },
    orderBy: { floorNumber: 'asc' },
  });
  sendSuccess(res, floors);
}

export async function createFloor(req: Request, res: Response): Promise<void> {
  const parsed = floorSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  try {
    const floor = await prisma.floor.create({
      data: { ...parsed.data, buildingId: req.params.buildingId },
    });
    sendSuccess(res, floor, 'Floor created', 201);
  } catch {
    sendError(res, 'Building not found or floor already exists', 400);
  }
}
