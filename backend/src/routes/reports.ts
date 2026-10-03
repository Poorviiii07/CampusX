import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { sendError } from '../utils/response';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\n');
}

router.get('/:type', async (req: Request, res: Response): Promise<void> => {
  const { type } = req.params;
  const { format } = req.query;
  const isCSV = format === 'csv';

  if (type === 'room-utilization') {
    const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
    const entries = await prisma.timetableEntry.findMany({
      where: activeSemester ? { semesterId: activeSemester.id } : {},
      include: { room: { select: { code: true, name: true, capacity: true } } },
    });

    const roomMap: Record<string, { code: string; name: string; capacity: number; periods: number }> = {};
    for (const e of entries) {
      if (!roomMap[e.roomId]) {
        roomMap[e.roomId] = { code: e.room.code, name: e.room.name, capacity: e.room.capacity, periods: 0 };
      }
      roomMap[e.roomId].periods++;
    }
    const data = Object.values(roomMap);

    if (isCSV) {
      const csv = toCSV(['Room Code', 'Room Name', 'Capacity', 'Periods Used'], data.map((d) => [d.code, d.name, d.capacity, d.periods]));
      res.setHeader('Content-Disposition', 'attachment; filename="room-utilization.csv"');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
      return;
    }
    res.json({ success: true, data });
    return;
  }

  if (type === 'complaints') {
    const complaints = await prisma.complaint.findMany({
      include: {
        reporter: { select: { name: true } },
        building: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (isCSV) {
      const csv = toCSV(
        ['ID', 'Category', 'Status', 'Priority', 'Building', 'Reporter', 'Created'],
        complaints.map((c) => [c.autoId, c.category, c.status, c.priority, c.building?.name ?? '', c.reporter.name, c.createdAt.toISOString()])
      );
      res.setHeader('Content-Disposition', 'attachment; filename="complaints.csv"');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
      return;
    }
    res.json({ success: true, data: complaints });
    return;
  }

  if (type === 'timetable') {
    const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
    const entries = await prisma.timetableEntry.findMany({
      where: activeSemester ? { semesterId: activeSemester.id } : {},
      include: {
        class: true,
        subject: { select: { code: true, name: true } },
        faculty: { select: { name: true } },
        room: { select: { code: true, name: true } },
      },
      orderBy: [{ day: 'asc' }, { period: 'asc' }],
    });

    if (isCSV) {
      const csv = toCSV(
        ['Class', 'Subject', 'Faculty', 'Room', 'Day', 'Period', 'Start', 'End'],
        entries.map((e) => [e.class.name, e.subject.name, e.faculty.name, e.room.code, e.day, e.period, e.startTime, e.endTime])
      );
      res.setHeader('Content-Disposition', 'attachment; filename="timetable.csv"');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
      return;
    }
    res.json({ success: true, data: entries });
    return;
  }

  if (type === 'energy') {
    const records = await prisma.energyRecord.findMany({
      include: { building: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { hour: 'asc' }],
      take: 1000,
    });

    if (isCSV) {
      const csv = toCSV(
        ['Building', 'Date', 'Hour', 'kWh', 'Anomaly'],
        records.map((r) => [r.building.name, r.date.toISOString().split('T')[0], r.hour, r.consumptionKwh, r.isAnomaly])
      );
      res.setHeader('Content-Disposition', 'attachment; filename="energy.csv"');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
      return;
    }
    res.json({ success: true, data: records });
    return;
  }

  if (type === 'resources') {
    const resources = await prisma.resource.findMany({
      include: {
        subject: { select: { code: true, name: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (isCSV) {
      const csv = toCSV(
        ['Title', 'Subject', 'Semester', 'Year', 'Type', 'Uploader', 'Downloads', 'Approved'],
        resources.map((r) => [r.title, r.subject?.name ?? '', r.semester, r.academicYear, r.examType, r.uploadedBy.name, r.downloadCount, r.isApproved])
      );
      res.setHeader('Content-Disposition', 'attachment; filename="resources.csv"');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
      return;
    }
    res.json({ success: true, data: resources });
    return;
  }

  sendError(res, `Unknown report type: ${type}`, 400);
});

export default router;
