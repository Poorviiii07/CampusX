import { Request, Response } from 'express';
import { z } from 'zod';
import { RoomType, RoomStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { findCurrentlyAvailableRooms } from '../services/availability';
import { logAction } from '../services/audit';

const roomSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.nativeEnum(RoomType),
  status: z.nativeEnum(RoomStatus).optional(),
  capacity: z.number().int().min(0).optional(),
  floor: z.number().int().min(0),
  floorId: z.string().uuid(),
  buildingId: z.string().uuid(),
  department: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  accessibility: z.string().optional(),
  description: z.string().optional(),
  coordinatesX: z.number().optional(),
  coordinatesY: z.number().optional(),
});

export async function listRooms(req: Request, res: Response): Promise<void> {
  const { buildingId, floorId, type, status, capacity, department } = req.query;
  const where: Record<string, unknown> = { isActive: true };
  if (buildingId) where.buildingId = buildingId;
  if (floorId) where.floorId = floorId;
  if (type) where.type = type;
  if (status) where.status = status;
  if (department) where.department = department;
  if (capacity) where.capacity = { gte: Number(capacity) };

  const rooms = await prisma.room.findMany({
    where: where as any,
    include: { building: { select: { name: true, code: true } }, floorRelation: { select: { name: true, floorNumber: true } } },
    orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { code: 'asc' }],
  });
  sendSuccess(res, rooms);
}

export async function createRoom(req: Request, res: Response): Promise<void> {
  const parsed = roomSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const { equipment, ...rest } = parsed.data;
  const room = await prisma.room.create({
    data: { ...rest, equipment: JSON.stringify(equipment ?? []) },
  });
  await logAction(req.user!.id, 'CREATE_ROOM', 'Room', room.id);
  sendSuccess(res, room, 'Room created', 201);
}

export async function getRoom(req: Request, res: Response): Promise<void> {
  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: {
      building: true,
      floorRelation: true,
    },
  });
  if (!room) { sendError(res, 'Room not found', 404); return; }
  sendSuccess(res, room);
}

export async function updateRoom(req: Request, res: Response): Promise<void> {
  const parsed = roomSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const { equipment, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (equipment !== undefined) updateData.equipment = JSON.stringify(equipment);

  try {
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: updateData as any,
    });
    await logAction(req.user!.id, 'UPDATE_ROOM', 'Room', room.id);
    sendSuccess(res, room);
  } catch {
    sendError(res, 'Room not found', 404);
  }
}

export async function updateRoomStatus(req: Request, res: Response): Promise<void> {
  const { status, reason } = req.body;
  if (!status) { sendError(res, 'status required', 400); return; }
  try {
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { status: status as RoomStatus },
    });
    await logAction(req.user!.id, 'UPDATE_ROOM_STATUS', 'Room', room.id, { status, reason });
    sendSuccess(res, room);
  } catch {
    sendError(res, 'Room not found', 404);
  }
}

export async function getAvailableNow(_req: Request, res: Response): Promise<void> {
  const rooms = await findCurrentlyAvailableRooms();
  sendSuccess(res, rooms);
}
