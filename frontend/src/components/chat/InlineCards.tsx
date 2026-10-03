import { Download } from 'lucide-react';
import Badge, { RoomStatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { Room, Resource, Complaint } from '@/types';

// ─── RoomMiniCard ─────────────────────────────────────────────────────
export interface RoomMiniCardProps {
  room: Partial<Room> & { code: string };
}
export function RoomMiniCard({ room }: RoomMiniCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm max-w-[280px] w-full">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{room.code}</p>
          {room.name && <p className="text-xs text-gray-500 mt-0.5">{room.name}</p>}
        </div>
        {room.status && <RoomStatusBadge status={room.status} />}
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {room.type && <Badge variant="gray">{room.type.replace('_', ' ')}</Badge>}
        {room.capacity && (
          <span className="text-gray-500">Cap: {room.capacity}</span>
        )}
      </div>
      {(room.buildingId !== undefined || room.floor !== undefined) && (
        <p className="mt-1.5 text-xs text-gray-500">
          {[room.buildingId, room.floor !== undefined ? `Floor ${room.floor}` : undefined]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}

// ─── ResourceMiniCard ─────────────────────────────────────────────────
export interface ResourceMiniCardProps {
  resource: Partial<Resource> & { title: string };
  onDownload?: () => void;
  isDownloading?: boolean;
}
export function ResourceMiniCard({ resource, onDownload, isDownloading }: ResourceMiniCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm max-w-[280px] w-full">
      <p className="font-semibold text-gray-800 text-sm line-clamp-2">{resource.title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {resource.examType && (
          <Badge variant="primary">{resource.examType.replace('_', ' ')}</Badge>
        )}
        {resource.subjectId && <Badge variant="gray">{resource.subjectId}</Badge>}
      </div>
      {resource.downloadCount !== undefined && (
        <p className="mt-1 text-xs text-gray-400">{resource.downloadCount} downloads</p>
      )}
      {onDownload && (
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<Download size={13} />}
          loading={isDownloading}
          className="mt-2 w-full"
          onClick={onDownload}
        >
          Download
        </Button>
      )}
    </div>
  );
}

// ─── ComplaintMiniCard ────────────────────────────────────────────────
export interface ComplaintMiniCardProps {
  complaint: Partial<Complaint> & { autoId: string };
}
export function ComplaintMiniCard({ complaint }: ComplaintMiniCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm max-w-[280px] w-full">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-xs text-gray-700">{complaint.autoId}</p>
        {complaint.status && (
          <Badge variant={
            complaint.status === 'RESOLVED' || complaint.status === 'CLOSED'
              ? 'success'
              : complaint.status === 'OPEN'
              ? 'danger'
              : 'warning'
          }>
            {complaint.status.replace('_', ' ')}
          </Badge>
        )}
      </div>
      {complaint.category && (
        <p className="mt-1 text-xs text-gray-600">{complaint.category.replace('_', ' ')}</p>
      )}
      {complaint.createdAt && (
        <p className="mt-1 text-xs text-gray-400">
          {new Date(complaint.createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
