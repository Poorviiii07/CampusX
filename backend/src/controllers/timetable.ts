import { Request, Response } from 'express';
import { z } from 'zod';
import { DayOfWeek } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { detectConflicts, TimetableEntryInput } from '../services/conflict';
import { getPeriodTimes } from '../utils/period';
import { logAction } from '../services/audit';

const entrySchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  facultyId: z.string().uuid(),
  roomId: z.string().uuid(),
  semesterId: z.string().uuid(),
  day: z.nativeEnum(DayOfWeek),
  period: z.number().int().min(1).max(8),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const semesterSchema = z.object({
  type: z.enum(['ODD', 'EVEN']),
  academicYear: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  isActive: z.boolean().optional(),
});

const classSchema = z.object({
  name: z.string().min(1),
  departmentId: z.string().uuid(),
  semesterId: z.string().uuid(),
  semesterNumber: z.number().int().min(1),
  section: z.string().min(1),
  strength: z.number().int().min(0),
});

const subjectSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  credits: z.number().int().optional(),
  departmentId: z.string().uuid(),
  semester: z.number().int().min(1),
});

// ─── Timetable Entries ────────────────────────────────────────────────────────

export async function listEntries(req: Request, res: Response): Promise<void> {
  const { classId, semesterId, facultyId, roomId, day } = req.query;
  const where: Record<string, unknown> = {};
  if (classId) where.classId = classId;
  if (semesterId) where.semesterId = semesterId;
  if (facultyId) where.facultyId = facultyId;
  if (roomId) where.roomId = roomId;
  if (day) where.day = day;

  const entries = await prisma.timetableEntry.findMany({
    where: where as any,
    include: {
      class: true,
      subject: true,
      faculty: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, code: true, name: true, capacity: true } },
      semester: true,
    },
    orderBy: [{ day: 'asc' }, { period: 'asc' }],
  });
  sendSuccess(res, entries);
}

async function buildEntryInput(data: z.infer<typeof entrySchema>): Promise<TimetableEntryInput & { roomCapacity: number; classStrength: number }> {
  const times = getPeriodTimes(data.period);
  const room = await prisma.room.findUnique({ where: { id: data.roomId }, select: { capacity: true } });
  const cls = await prisma.class.findUnique({ where: { id: data.classId }, select: { strength: true } });
  return {
    ...data,
    startTime: data.startTime ?? times.start,
    endTime: data.endTime ?? times.end,
    roomCapacity: room?.capacity ?? 0,
    classStrength: cls?.strength ?? 0,
  };
}

export async function createEntry(req: Request, res: Response): Promise<void> {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const entryInput = await buildEntryInput(parsed.data);
  const conflicts = detectConflicts([entryInput]);
  if (conflicts.length > 0) {
    sendError(res, 'Timetable conflict detected', 409, conflicts);
    return;
  }

  try {
    const entry = await prisma.timetableEntry.create({
      data: {
        classId: entryInput.classId,
        subjectId: entryInput.subjectId,
        facultyId: entryInput.facultyId,
        roomId: entryInput.roomId,
        semesterId: entryInput.semesterId,
        day: entryInput.day,
        period: entryInput.period,
        startTime: entryInput.startTime,
        endTime: entryInput.endTime,
      },
      include: { class: true, subject: true, faculty: { select: { id: true, name: true } }, room: true },
    });
    await logAction(req.user!.id, 'CREATE_TIMETABLE_ENTRY', 'TimetableEntry', entry.id);
    sendSuccess(res, entry, 'Entry created', 201);
  } catch (err: any) {
    if (err.code === 'P2002') {
      sendError(res, 'Timetable conflict: duplicate entry', 409);
      return;
    }
    throw err;
  }
}

export async function updateEntry(req: Request, res: Response): Promise<void> {
  const parsed = entrySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  try {
    const entry = await prisma.timetableEntry.update({
      where: { id: req.params.id },
      data: parsed.data as any,
    });
    await logAction(req.user!.id, 'UPDATE_TIMETABLE_ENTRY', 'TimetableEntry', entry.id);
    sendSuccess(res, entry);
  } catch {
    sendError(res, 'Entry not found', 404);
  }
}

export async function deleteEntry(req: Request, res: Response): Promise<void> {
  try {
    await prisma.timetableEntry.delete({ where: { id: req.params.id } });
    await logAction(req.user!.id, 'DELETE_TIMETABLE_ENTRY', 'TimetableEntry', req.params.id);
    sendSuccess(res, null, 'Entry deleted');
  } catch {
    sendError(res, 'Entry not found', 404);
  }
}

export async function importCSV(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No CSV file uploaded', 400);
    return;
  }

  const { semesterId } = req.body;
  if (!semesterId) {
    sendError(res, 'semesterId required', 400);
    return;
  }

  let records: Record<string, string>[];
  try {
    records = parse(req.file.buffer, { columns: true, skip_empty_lines: true });
  } catch {
    sendError(res, 'Invalid CSV file', 400);
    return;
  }

  const created: unknown[] = [];
  const errors: unknown[] = [];

  for (const row of records) {
    try {
      const data = {
        classId: row.classId,
        subjectId: row.subjectId,
        facultyId: row.facultyId,
        roomId: row.roomId,
        semesterId,
        day: row.day as DayOfWeek,
        period: parseInt(row.period, 10),
        startTime: row.startTime,
        endTime: row.endTime,
      };
      const entry = await prisma.timetableEntry.create({ data });
      created.push(entry);
    } catch (err: any) {
      errors.push({ row, error: err.message });
    }
  }

  sendSuccess(res, { created: created.length, errors }, 'Import complete');
}

export async function listConflicts(_req: Request, res: Response): Promise<void> {
  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
  if (!activeSemester) {
    sendSuccess(res, []);
    return;
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { semesterId: activeSemester.id },
    include: { room: { select: { capacity: true } }, class: { select: { strength: true } } },
  });

  const entryInputs: TimetableEntryInput[] = entries.map((e) => ({
    id: e.id,
    classId: e.classId,
    subjectId: e.subjectId,
    facultyId: e.facultyId,
    roomId: e.roomId,
    semesterId: e.semesterId,
    day: e.day,
    period: e.period,
    startTime: e.startTime,
    endTime: e.endTime,
    roomCapacity: e.room.capacity,
    classStrength: e.class.strength,
  }));

  const conflicts = detectConflicts(entryInputs);
  sendSuccess(res, conflicts);
}

// ─── Classes ──────────────────────────────────────────────────────────────────

export async function listClasses(req: Request, res: Response): Promise<void> {
  const { departmentId, semesterId } = req.query;
  const where: Record<string, unknown> = {};
  if (departmentId) where.departmentId = departmentId;
  if (semesterId) where.semesterId = semesterId;

  const classes = await prisma.class.findMany({
    where: where as any,
    include: {
      department: true,
      semester: true,
      _count: { select: { timetableEntries: true } },
    },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, classes);
}

export async function createClass(req: Request, res: Response): Promise<void> {
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  try {
    const cls = await prisma.class.create({ data: parsed.data });
    sendSuccess(res, cls, 'Class created', 201);
  } catch (err: any) {
    if (err.code === 'P2002') {
      sendError(res, 'Class already exists with same dept/semester/section', 409);
      return;
    }
    throw err;
  }
}

// ─── Semesters ────────────────────────────────────────────────────────────────

export async function listSemesters(_req: Request, res: Response): Promise<void> {
  const semesters = await prisma.semester.findMany({
    include: { _count: { select: { classes: true, timetableEntries: true } } },
    orderBy: { createdAt: 'desc' },
  });
  sendSuccess(res, semesters);
}

export async function createSemester(req: Request, res: Response): Promise<void> {
  const parsed = semesterSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  const data = {
    ...parsed.data,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
  };
  const semester = await prisma.semester.create({ data });
  sendSuccess(res, semester, 'Semester created', 201);
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export async function listSubjects(req: Request, res: Response): Promise<void> {
  const { departmentId } = req.query;
  const subjects = await prisma.subject.findMany({
    where: departmentId ? { departmentId: departmentId as string } : undefined,
    include: { department: { select: { name: true, code: true } } },
    orderBy: { name: 'asc' },
  });
  sendSuccess(res, subjects);
}

export async function createSubject(req: Request, res: Response): Promise<void> {
  const parsed = subjectSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400, parsed.error.errors);
    return;
  }
  try {
    const subject = await prisma.subject.create({ data: parsed.data });
    sendSuccess(res, subject, 'Subject created', 201);
  } catch (err: any) {
    if (err.code === 'P2002') {
      sendError(res, 'Subject code already exists', 409);
      return;
    }
    throw err;
  }
}
