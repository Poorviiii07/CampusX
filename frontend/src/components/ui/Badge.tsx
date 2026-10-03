import { ReactNode } from 'react';
import type { ComplaintStatus, RoomStatus } from '@/types';

export type BadgeVariant =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gray';

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-800',
  accent: 'bg-accent-100 text-accent-800',
  success: 'bg-success-100 text-success-800',
  warning: 'bg-warning-100 text-warning-800',
  danger: 'bg-danger-100 text-danger-800',
  gray: 'bg-gray-100 text-gray-700',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

const roomStatusVariant: Record<RoomStatus, BadgeVariant> = {
  AVAILABLE: 'success',
  OCCUPIED: 'danger',
  MAINTENANCE: 'warning',
  RESERVED: 'primary',
  TEMP_UNAVAILABLE: 'gray',
};

const complaintStatusVariant: Record<ComplaintStatus, BadgeVariant> = {
  OPEN: 'danger',
  ASSIGNED: 'primary',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'gray',
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return (
    <Badge variant={roomStatusVariant[status]}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <Badge variant={complaintStatusVariant[status]}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

export default Badge;
