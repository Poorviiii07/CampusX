import { prisma } from '../lib/prisma';

export async function getOverview() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    buildings,
    rooms,
    availableRooms,
    occupiedRooms,
    maintenanceRooms,
    activeComplaints,
    pendingComplaints,
    resolvedToday,
  ] = await Promise.all([
    prisma.building.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isActive: true, status: 'AVAILABLE' } }),
    prisma.room.count({ where: { isActive: true, status: 'OCCUPIED' } }),
    prisma.room.count({ where: { isActive: true, status: 'MAINTENANCE' } }),
    prisma.complaint.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } }),
    prisma.complaint.count({ where: { status: 'OPEN' } }),
    prisma.complaint.count({ where: { status: 'RESOLVED', updatedAt: { gte: todayStart, lte: todayEnd } } }),
  ]);

  // Today's classes
  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
  let todayClasses = 0;
  if (activeSemester) {
    todayClasses = await prisma.timetableEntry.count({ where: { semesterId: activeSemester.id } });
  }

  const utilizationPercent =
    occupiedRooms + availableRooms > 0
      ? Math.round((occupiedRooms / (occupiedRooms + availableRooms)) * 100)
      : 0;

  return {
    buildings,
    rooms,
    availableRooms,
    occupiedRooms,
    maintenanceRooms,
    activeComplaints,
    pendingComplaints,
    resolvedToday,
    todayClasses,
    utilizationPercent,
  };
}

export async function getUtilization() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const buildings = await prisma.building.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });

  if (!activeSemester) return [];

  const result = await Promise.all(
    buildings.map(async (b) => {
      const totalRooms = await prisma.room.count({ where: { buildingId: b.id, isActive: true } });
      const usedEntries = await prisma.timetableEntry.count({
        where: { semesterId: activeSemester.id, room: { buildingId: b.id } },
      });
      const maxPossible = totalRooms * 6 * 8; // 6 days, 8 periods
      const utilizationPct = maxPossible > 0 ? Math.round((usedEntries / maxPossible) * 100) : 0;
      return { building: b.name, buildingId: b.id, totalRooms, usedEntries, utilizationPct };
    })
  );

  return result;
}

export async function getComplaintAnalytics() {
  const results = [];
  for (let w = 7; w >= 0; w--) {
    const end = new Date();
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);

    const [open, resolved, inProgress] = await Promise.all([
      prisma.complaint.count({ where: { status: 'OPEN', createdAt: { gte: start, lte: end } } }),
      prisma.complaint.count({ where: { status: 'RESOLVED', createdAt: { gte: start, lte: end } } }),
      prisma.complaint.count({ where: { status: 'IN_PROGRESS', createdAt: { gte: start, lte: end } } }),
    ]);

    results.push({
      week: `W-${w}`,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      open,
      resolved,
      inProgress,
    });
  }
  return results;
}

export async function getAlerts() {
  const alerts: { type: string; message: string; severity: string; entityId?: string }[] = [];
  const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });

  if (activeSemester) {
    // Rooms with capacity < class strength in timetable
    const entries = await prisma.timetableEntry.findMany({
      where: { semesterId: activeSemester.id },
      include: { room: { select: { capacity: true, code: true } }, class: { select: { strength: true, name: true } } },
    });

    for (const e of entries) {
      if (e.room.capacity < e.class.strength) {
        alerts.push({
          type: 'CAPACITY_VIOLATION',
          message: `Room ${e.room.code} (cap:${e.room.capacity}) is smaller than class ${e.class.name} strength (${e.class.strength})`,
          severity: 'HIGH',
          entityId: e.id,
        });
      }
    }
  }

  // Complaints open > 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oldComplaints = await prisma.complaint.findMany({
    where: { status: { in: ['OPEN', 'ASSIGNED'] }, createdAt: { lt: sevenDaysAgo } },
    select: { id: true, autoId: true, category: true },
  });
  for (const c of oldComplaints) {
    alerts.push({
      type: 'STALE_COMPLAINT',
      message: `Complaint ${c.autoId} (${c.category}) has been open for more than 7 days`,
      severity: 'MEDIUM',
      entityId: c.id,
    });
  }

  // Rooms with > 3 open complaints
  const roomComplaintGroups = await prisma.complaint.groupBy({
    by: ['roomId'],
    where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] }, roomId: { not: null } },
    _count: { _all: true },
    having: { roomId: { _count: { gt: 3 } } },
  });
  for (const rcg of roomComplaintGroups) {
    if (rcg.roomId) {
      alerts.push({
        type: 'ROOM_MULTIPLE_COMPLAINTS',
        message: `Room has ${rcg._count._all} open complaints`,
        severity: 'HIGH',
        entityId: rcg.roomId,
      });
    }
  }

  // Energy anomalies in last 24h
  const last24h = new Date();
  last24h.setHours(last24h.getHours() - 24);
  const anomalies = await prisma.energyRecord.count({ where: { isAnomaly: true, createdAt: { gte: last24h } } });
  if (anomalies > 0) {
    alerts.push({ type: 'ENERGY_ANOMALY', message: `${anomalies} energy anomaly(ies) detected in last 24 hours`, severity: 'MEDIUM' });
  }

  return alerts;
}
