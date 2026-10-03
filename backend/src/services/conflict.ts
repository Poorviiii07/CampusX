import { DayOfWeek } from '@prisma/client';

export interface TimetableEntryInput {
  id?: string;
  classId: string;
  subjectId: string;
  facultyId: string;
  roomId: string;
  semesterId: string;
  day: DayOfWeek;
  period: number;
  startTime: string;
  endTime: string;
  classStrength?: number;
  roomCapacity?: number;
}

export interface ConflictResult {
  type: 'ROOM_DOUBLE_BOOKED' | 'FACULTY_DOUBLE_BOOKED' | 'CLASS_DOUBLE_BOOKED' | 'CAPACITY_MISMATCH';
  message: string;
  entry1?: TimetableEntryInput;
  entry2?: TimetableEntryInput;
}

export function detectConflicts(entries: TimetableEntryInput[]): ConflictResult[] {
  const conflicts: ConflictResult[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];

      if (a.semesterId !== b.semesterId || a.day !== b.day || a.period !== b.period) continue;

      // Room double-booked
      if (a.roomId === b.roomId) {
        conflicts.push({
          type: 'ROOM_DOUBLE_BOOKED',
          message: `Room ${a.roomId} is double-booked on ${a.day} period ${a.period}`,
          entry1: a,
          entry2: b,
        });
      }

      // Faculty double-booked
      if (a.facultyId === b.facultyId) {
        conflicts.push({
          type: 'FACULTY_DOUBLE_BOOKED',
          message: `Faculty ${a.facultyId} is double-booked on ${a.day} period ${a.period}`,
          entry1: a,
          entry2: b,
        });
      }

      // Class double-booked
      if (a.classId === b.classId) {
        conflicts.push({
          type: 'CLASS_DOUBLE_BOOKED',
          message: `Class ${a.classId} is double-booked on ${a.day} period ${a.period}`,
          entry1: a,
          entry2: b,
        });
      }
    }

    // Capacity mismatch (single-entry check)
    const e = entries[i];
    if (e.classStrength !== undefined && e.roomCapacity !== undefined) {
      if (e.roomCapacity < e.classStrength) {
        conflicts.push({
          type: 'CAPACITY_MISMATCH',
          message: `Room capacity (${e.roomCapacity}) is less than class strength (${e.classStrength})`,
          entry1: e,
        });
      }
    }
  }

  return conflicts;
}
