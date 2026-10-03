import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';

export async function bulkInsertRecords(req: Request, res: Response): Promise<void> {
  const { records } = req.body as { records: { buildingId: string; floorId?: string; roomId?: string; date: string; hour: number; consumptionKwh: number; meterId?: string }[] };

  if (!Array.isArray(records) || records.length === 0) {
    sendError(res, 'records array required', 400);
    return;
  }

  // Compute mean and stddev per building+hour to detect anomalies
  const anomalyCache: Record<string, { mean: number; stddev: number }> = {};

  async function getStats(buildingId: string, hour: number) {
    const key = `${buildingId}:${hour}`;
    if (anomalyCache[key]) return anomalyCache[key];

    const existing = await prisma.energyRecord.findMany({
      where: { buildingId, hour },
      select: { consumptionKwh: true },
    });

    if (existing.length < 2) {
      anomalyCache[key] = { mean: 0, stddev: 0 };
      return anomalyCache[key];
    }

    const vals = existing.map((r) => r.consumptionKwh);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
    const stddev = Math.sqrt(variance);
    anomalyCache[key] = { mean, stddev };
    return anomalyCache[key];
  }

  const created: unknown[] = [];
  for (const r of records) {
    const stats = await getStats(r.buildingId, r.hour);
    const isAnomaly = stats.stddev > 0 && r.consumptionKwh > stats.mean + 2 * stats.stddev;

    const record = await prisma.energyRecord.create({
      data: {
        buildingId: r.buildingId,
        floorId: r.floorId ?? undefined,
        roomId: r.roomId ?? undefined,
        date: new Date(r.date),
        hour: r.hour,
        consumptionKwh: r.consumptionKwh,
        meterId: r.meterId ?? undefined,
        isAnomaly,
      },
    });
    created.push(record);
  }

  sendSuccess(res, { created: created.length }, 'Records inserted', 201);
}

export async function getEnergyData(req: Request, res: Response): Promise<void> {
  const { buildingId, startDate, endDate, groupBy } = req.query;

  const where: Record<string, unknown> = {};
  if (buildingId) where.buildingId = buildingId;
  if (startDate || endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);
    where.date = dateFilter;
  }

  const records = await prisma.energyRecord.findMany({
    where: where as any,
    include: { building: { select: { name: true } } },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  });

  sendSuccess(res, records);
}

export async function getAnomalies(req: Request, res: Response): Promise<void> {
  const { buildingId, startDate, endDate } = req.query;
  const where: Record<string, unknown> = { isAnomaly: true };
  if (buildingId) where.buildingId = buildingId;
  if (startDate || endDate) {
    const dateFilter: Record<string, unknown> = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);
    where.date = dateFilter;
  }

  const anomalies = await prisma.energyRecord.findMany({
    where: where as any,
    include: { building: { select: { name: true } } },
    orderBy: { date: 'desc' },
  });

  sendSuccess(res, anomalies);
}

export async function getEnergySummary(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;

  const currentWhere: Record<string, unknown> = {};
  if (startDate || endDate) {
    const df: Record<string, unknown> = {};
    if (startDate) df.gte = new Date(startDate as string);
    if (endDate) df.lte = new Date(endDate as string);
    currentWhere.date = df;
  }

  const current = await prisma.energyRecord.groupBy({
    by: ['buildingId'],
    where: currentWhere as any,
    _sum: { consumptionKwh: true },
  });

  // Previous period for comparison
  const msInPeriod = startDate && endDate
    ? new Date(endDate as string).getTime() - new Date(startDate as string).getTime()
    : 7 * 24 * 60 * 60 * 1000;

  const prevEnd = startDate ? new Date(startDate as string) : new Date(Date.now() - msInPeriod);
  const prevStart = new Date(prevEnd.getTime() - msInPeriod);

  const previous = await prisma.energyRecord.groupBy({
    by: ['buildingId'],
    where: { date: { gte: prevStart, lte: prevEnd } } as any,
    _sum: { consumptionKwh: true },
  });

  const buildings = await prisma.building.findMany({ select: { id: true, name: true } });
  const buildingMap = Object.fromEntries(buildings.map((b) => [b.id, b.name]));

  const summary = current.map((c) => {
    const prev = previous.find((p) => p.buildingId === c.buildingId);
    const currentKwh = c._sum.consumptionKwh ?? 0;
    const prevKwh = prev?._sum.consumptionKwh ?? 0;
    const change = prevKwh > 0 ? Math.round(((currentKwh - prevKwh) / prevKwh) * 100) : 0;
    return {
      buildingId: c.buildingId,
      buildingName: buildingMap[c.buildingId] ?? 'Unknown',
      currentKwh,
      previousKwh: prevKwh,
      changePercent: change,
    };
  });

  sendSuccess(res, summary);
}
