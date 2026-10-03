import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function logAction(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        entityType,
        entityId: entityId ?? undefined,
        details: details ? (details as Prisma.InputJsonValue) : undefined,
        ipAddress: ipAddress ?? undefined,
      },
    });
  } catch (err) {
    // Non-fatal — log but don't throw
    console.error('Audit log error:', err);
  }
}
