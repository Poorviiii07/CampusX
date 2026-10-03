import { CheckCircle, XCircle, Wrench, Lock, Clock, type LucideIcon } from 'lucide-react';
import type { RoomStatus, RoomType } from '@/types';

export interface StatusConfig {
  color: string;
  icon: LucideIcon;
  label: string;
}

// Status → color / icon / human label (matches FEAT-004 spec)
export const ROOM_STATUS_CONFIG: Record<RoomStatus, StatusConfig> = {
  AVAILABLE: { color: '#10B981', icon: CheckCircle, label: 'Available' },
  OCCUPIED: { color: '#EF4444', icon: XCircle, label: 'Occupied' },
  MAINTENANCE: { color: '#F59E0B', icon: Wrench, label: 'Maintenance' },
  RESERVED: { color: '#3B82F6', icon: Lock, label: 'Reserved' },
  TEMP_UNAVAILABLE: { color: '#EAB308', icon: Clock, label: 'Temp Unavailable' },
};

// Canonical order used by the legend and marker filters
export const STATUS_ORDER: RoomStatus[] = [
  'AVAILABLE',
  'OCCUPIED',
  'MAINTENANCE',
  'RESERVED',
  'TEMP_UNAVAILABLE',
];

// Room types visible to guests (everyone else sees all types)
export const PUBLIC_ROOM_TYPES: RoomType[] = [
  'CLASSROOM',
  'LAB',
  'RESTROOM',
  'LIBRARY',
  'SEMINAR_HALL',
  'AUDITORIUM',
  'OFFICE',
];

// Parse the JSON-encoded equipment array stored on Room
export function parseEquipment(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
