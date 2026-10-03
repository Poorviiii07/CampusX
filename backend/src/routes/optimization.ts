import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { logAction } from '../services/audit';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/suggest', async (req: Request, res: Response): Promise<void> => {
  const { semester_id } = req.query;
  if (!semester_id) {
    sendError(res, 'semester_id required', 400);
    return;
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { semesterId: semester_id as string },
    include: {
      class: { select: { strength: true, name: true, departmentId: true } },
      room: { select: { id: true, code: true, name: true, capacity: true, department: true, buildingId: true, type: true } },
      subject: { select: { name: true } },
    },
  });

  const suggestions: {
    entryId: string;
    currentRoom: { id: string; code: string; capacity: number };
    suggestedRoom?: { id: string; code: string; capacity: number };
    reason: string;
    efficiencyGain: number;
  }[] = [];

  for (const entry of entries) {
    const classStrength = entry.class.strength;
    const roomCapacity = entry.room.capacity;

    // Oversized room: capacity > class_strength * 2
    if (roomCapacity > classStrength * 2) {
      // Find a better-fit room
      const betterRoom = await prisma.room.findFirst({
        where: {
          isActive: true,
          status: 'AVAILABLE',
          type: entry.room.type,
          capacity: { gte: classStrength, lte: classStrength * 2 },
          id: { not: entry.room.id },
        },
        orderBy: { capacity: 'asc' },
      });

      const efficiencyGain = betterRoom
        ? Math.round(((roomCapacity - betterRoom.capacity) / roomCapacity) * 100)
        : 0;

      suggestions.push({
        entryId: entry.id,
        currentRoom: { id: entry.room.id, code: entry.room.code, capacity: roomCapacity },
        suggestedRoom: betterRoom
          ? { id: betterRoom.id, code: betterRoom.code, capacity: betterRoom.capacity }
          : undefined,
        reason: `Room capacity (${roomCapacity}) is more than double the class strength (${classStrength})`,
        efficiencyGain,
      });
    }
  }

  sendSuccess(res, suggestions);
});

router.post('/apply', async (req: Request, res: Response): Promise<void> => {
  const { changes } = req.body as { changes: { entryId: string; newRoomId: string }[] };
  if (!Array.isArray(changes)) {
    sendError(res, 'changes array required', 400);
    return;
  }

  let updated = 0;
  for (const change of changes) {
    try {
      await prisma.timetableEntry.update({
        where: { id: change.entryId },
        data: { roomId: change.newRoomId },
      });
      updated++;
    } catch {
      // skip individual failures
    }
  }

  await logAction(req.user!.id, 'OPTIMIZATION_APPLY', 'TimetableEntry', undefined, { updated });
  sendSuccess(res, { updated });
});

export default router;
