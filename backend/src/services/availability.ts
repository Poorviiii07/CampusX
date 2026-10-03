import { RoomType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCurrentPeriod, isDayOfWeek } from '../utils/period';

interface FindAvailableParams {
  date: Date;
  period: number;
  capacity?: number;
  type?: RoomType;
  buildingId?: string;
  equipment?: string[];
}

export async function findAvailableRooms(params: FindAvailableParams) {
  const { date, period, capacity, type, buildingId, equipment } = params;

  // Determine day of week
  const dayOfWeek = isDayOfWeek(date);

  // Get active semester
  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });

  // Find rooms with no timetable entry for room+day+period in active semester
  // AND no active reservation overlapping the date+period
  // AND status = AVAILABLE

  // Step 1: rooms occupied by timetable (if active semester and valid day)
  const timetableOccupiedRoomIds: string[] = [];
  if (activeSemester && dayOfWeek) {
    const ttEntries = await prisma.timetableEntry.findMany({
      where: { semesterId: activeSemester.id, day: dayOfWeek, period },
      select: { roomId: true },
    });
    timetableOccupiedRoomIds.push(...ttEntries.map((e) => e.roomId));
  }

  // Step 2: rooms occupied by reservations
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const reservedEntries = await prisma.roomReservation.findMany({
    where: {
      status: 'ACTIVE',
      date: { gte: startOfDay, lte: endOfDay },
      periodStart: { lte: period },
      periodEnd: { gte: period },
    },
    select: { roomId: true },
  });
  const reservedRoomIds = reservedEntries.map((r) => r.roomId);

  const excludedIds = [...new Set([...timetableOccupiedRoomIds, ...reservedRoomIds])];

  // Step 3: query available rooms
  const where: Record<string, unknown> = {
    isActive: true,
    status: 'AVAILABLE',
  };
  if (excludedIds.length > 0) {
    where.id = { notIn: excludedIds };
  }
  if (capacity !== undefined) {
    where.capacity = { gte: capacity };
  }
  if (type) {
    where.type = type;
  }
  if (buildingId) {
    where.buildingId = buildingId;
  }

  let rooms = await prisma.room.findMany({
    where: where as any,
    include: {
      building: { select: { name: true, code: true } },
      floorRelation: { select: { name: true, floorNumber: true } },
    },
    orderBy: { capacity: 'asc' },
  });

  // Filter by equipment if requested
  if (equipment && equipment.length > 0) {
    rooms = rooms.filter((room) => {
      try {
        const roomEquip: string[] = JSON.parse(room.equipment);
        return equipment.every((eq) =>
          roomEquip.some((re) => re.toLowerCase().includes(eq.toLowerCase()))
        );
      } catch {
        return false;
      }
    });
  }

  return rooms;
}

export async function findCurrentlyAvailableRooms() {
  const now = new Date();
  const period = getCurrentPeriod(now);
  if (period === null) {
    // Outside teaching hours — all AVAILABLE rooms are free
    return prisma.room.findMany({
      where: { isActive: true, status: 'AVAILABLE' },
      include: {
        building: { select: { name: true, code: true } },
        floorRelation: { select: { name: true, floorNumber: true } },
      },
      orderBy: { capacity: 'asc' },
    });
  }
  return findAvailableRooms({ date: now, period });
}

export async function isClassFree(
  classId: string,
  period: number,
  date: Date
): Promise<boolean> {
  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
  if (!activeSemester) return true;

  const dayOfWeek = isDayOfWeek(date);
  if (!dayOfWeek) return true; // Sunday

  const entry = await prisma.timetableEntry.findFirst({
    where: { classId, semesterId: activeSemester.id, day: dayOfWeek, period },
  });
  return entry === null;
}
