import { CheckCircle, XCircle, Wrench, Lock, Clock, type LucideIcon } from 'lucide-react';
import type { RoomStatus, RoomType } from '@/types';

export interface StatusConfig {
  color: string;
  icon: LucideIcon;
  label: string;
}

// Status → color / icon / human label — palette: #BCD979 #9DAD6F #C3DFE0 #7D6D61 #EF4444
export const ROOM_STATUS_CONFIG: Record<RoomStatus, StatusConfig> = {
  AVAILABLE:       { color: '#9DAD6F', icon: CheckCircle, label: 'Available' },       // olive green
  OCCUPIED:        { color: '#EF4444', icon: XCircle,     label: 'Occupied' },        // red (semantic)
  MAINTENANCE:     { color: '#F59E0B', icon: Wrench,      label: 'Maintenance' },     // amber (semantic)
  RESERVED:        { color: '#7D6D61', icon: Lock,        label: 'Reserved' },        // warm taupe
  TEMP_UNAVAILABLE:{ color: '#C3DFE0', icon: Clock,       label: 'Temp Unavailable' },// powder teal
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
