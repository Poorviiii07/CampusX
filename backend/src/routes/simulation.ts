import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { findAvailableRooms } from '../services/availability';
import { isDayOfWeek } from '../utils/period';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'FACULTY']));

router.post('/run', async (req: Request, res: Response): Promise<void> => {
  const { scenario_type, params } = req.body;

  if (!scenario_type) {
    sendError(res, 'scenario_type required', 400);
    return;
  }

  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
  if (!activeSemester) {
    sendError(res, 'No active semester', 400);
    return;
  }

  if (scenario_type === 'ROOM_UNAVAILABLE') {
    const { roomId, date, period } = params || {};
    if (!roomId || !date || !period) {
      sendError(res, 'params.roomId, params.date, params.period required', 400);
      return;
    }

    const parsedDate = new Date(date);
    const dayOfWeek = isDayOfWeek(parsedDate);
    if (!dayOfWeek) {
      sendError(res, 'Date must be a weekday', 400);
      return;
    }

    // Find affected timetable entries
    const affectedEntries = await prisma.timetableEntry.findMany({
      where: { roomId, semesterId: activeSemester.id, day: dayOfWeek, period: parseInt(period, 10) },
      include: { class: true, subject: { select: { name: true } }, faculty: { select: { name: true } } },
    });

    // Find alternative rooms
    const alternatives = await findAvailableRooms({
      date: parsedDate,
      period: parseInt(period, 10),
    });
    const filteredAlternatives = alternatives.filter((r) => r.id !== roomId);

    sendSuccess(res, {
      scenarioType: 'ROOM_UNAVAILABLE',
      conflicts: [],
      affected_classes: affectedEntries.map((e) => e.class.name),
      affected_rooms: [roomId],
      suggestions: filteredAlternatives.slice(0, 5).map((r) => ({
        roomId: r.id,
        roomCode: r.code,
        capacity: r.capacity,
        reason: 'Available alternative',
      })),
    });
    return;
  }

  if (scenario_type === 'CLASS_ADDED') {
    const { classId, subjectId, facultyId, roomId, day, period } = params || {};
    if (!classId || !facultyId || !roomId || !day || !period) {
      sendError(res, 'params.classId, facultyId, roomId, day, period required', 400);
      return;
    }

    const conflicts: string[] = [];

    // Check room conflict
    const roomConflict = await prisma.timetableEntry.findFirst({
      where: { roomId, semesterId: activeSemester.id, day, period: parseInt(period, 10) },
    });
    if (roomConflict) conflicts.push(`Room ${roomId} is already occupied on ${day} period ${period}`);

    // Check faculty conflict
    const facultyConflict = await prisma.timetableEntry.findFirst({
      where: { facultyId, semesterId: activeSemester.id, day, period: parseInt(period, 10) },
    });
    if (facultyConflict) conflicts.push(`Faculty ${facultyId} is already assigned on ${day} period ${period}`);

    // Check class conflict
    const classConflict = await prisma.timetableEntry.findFirst({
      where: { classId, semesterId: activeSemester.id, day, period: parseInt(period, 10) },
    });
    if (classConflict) conflicts.push(`Class ${classId} already has a class on ${day} period ${period}`);

    sendSuccess(res, {
      scenarioType: 'CLASS_ADDED',
      conflicts,
      affected_classes: conflicts.length > 0 ? [classId] : [],
      affected_rooms: conflicts.length > 0 ? [roomId] : [],
      suggestions: [],
    });
    return;
  }

  if (scenario_type === 'STRENGTH_INCREASE') {
    const { classId, newStrength } = params || {};
    if (!classId || !newStrength) {
      sendError(res, 'params.classId and params.newStrength required', 400);
      return;
    }

    const entries = await prisma.timetableEntry.findMany({
      where: { classId, semesterId: activeSemester.id },
      include: { room: { select: { id: true, code: true, capacity: true } } },
    });

    const affected = entries.filter((e) => e.room.capacity < parseInt(newStrength, 10));

    sendSuccess(res, {
      scenarioType: 'STRENGTH_INCREASE',
      conflicts: affected.map((e) => `Room ${e.room.code} capacity ${e.room.capacity} < new strength ${newStrength}`),
      affected_classes: [classId],
      affected_rooms: affected.map((e) => e.room.id),
      suggestions: [],
    });
    return;
  }

  sendError(res, `Unknown scenario_type: ${scenario_type}`, 400);
});

export default router;
