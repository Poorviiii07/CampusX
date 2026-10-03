import { Request, Response } from 'express';
import { z } from 'zod';
import { ReservationType, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { findAvailableRooms } from '../services/availability';
import { logAction } from '../services/audit';

const reservationSchema = z.object({
  roomId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  reason: z.string().min(1),
  date: z.string(),
  periodStart: z.number().int().min(1).max(8),
  periodEnd: z.number().int().min(1).max(8),
  type: z.nativeEnum(ReservationType).optional(),
});

async function expireOldReservations() {
  const now = new Date();
  await prisma.roomReservation.updateMany({
    where: {
      status: 'ACTIVE',
      date: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });
}

export async function createReservation(req: Request, res: Response): Promise<void> {
  const parsed = reservationSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const { roomId, classId, reason, date, periodStart, periodEnd, type } = parsed.data;

  const dateObj = new Date(date);

  // Check availability for each period in range
  for (let p = periodStart; p <= periodEnd; p++) {
    const available = await findAvailableRooms({ date: dateObj, period: p });
    const roomAvailable = available.some((r) => r.id === roomId);
    if (!roomAvailable) {
      sendError(res, `Room is not available for period ${p}`, 409);
      return;
    }
  }

  const reservation = await prisma.roomReservation.create({
    data: {
      roomId,
      reservedById: req.user!.id,
      classId: classId ?? undefined,
      reason,
      date: dateObj,
      periodStart,
      periodEnd,
      type: type ?? 'SINGLE',
    },
    include: {
      room: { select: { code: true, name: true } },
      reservedBy: { select: { name: true, email: true } },
    },
  });

  await logAction(req.user!.id, 'CREATE_RESERVATION', 'RoomReservation', reservation.id);
  sendSuccess(res, reservation, 'Reservation created', 201);
}

export async function listReservations(req: Request, res: Response): Promise<void> {
  await expireOldReservations();
  const role = req.user!.role as Role;
  const where: Record<string, unknown> =
    role === 'ADMIN' ? {} : { reservedById: req.user!.id };

  const reservations = await prisma.roomReservation.findMany({
    where: where as any,
    include: {
      room: { select: { code: true, name: true, buildingId: true } },
      reservedBy: { select: { name: true, email: true, role: true } },
      class: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, reservations);
}

export async function myReservations(req: Request, res: Response): Promise<void> {
  await expireOldReservations();
  const reservations = await prisma.roomReservation.findMany({
    where: { reservedById: req.user!.id },
    include: {
      room: { select: { code: true, name: true } },
      class: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, reservations);
}

export async function cancelReservation(req: Request, res: Response): Promise<void> {
  const reservation = await prisma.roomReservation.findUnique({ where: { id: req.params.id } });
  if (!reservation) { sendError(res, 'Reservation not found', 404); return; }

  if (reservation.reservedById !== req.user!.id && req.user!.role !== 'ADMIN') {
    sendError(res, 'Forbidden', 403);
    return;
  }

  const updated = await prisma.roomReservation.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  });
  await logAction(req.user!.id, 'CANCEL_RESERVATION', 'RoomReservation', updated.id);
  sendSuccess(res, updated, 'Reservation cancelled');
}

export async function updateReservationStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body;
  if (!status) { sendError(res, 'status required', 400); return; }
  try {
    const updated = await prisma.roomReservation.update({
      where: { id: req.params.id },
      data: { status },
    });
    sendSuccess(res, updated);
  } catch {
    sendError(res, 'Reservation not found', 404);
  }
}
