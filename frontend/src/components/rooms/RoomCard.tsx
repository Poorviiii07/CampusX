import { useState } from 'react';
import { Building2, Users, Layers } from 'lucide-react';
import type { Room } from '@/types';
import { Card, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ReservationModal from './ReservationModal';

export interface RoomCardProps {
  room: Room;
  showReserveButton?: boolean;
  onReserved?: () => void;
}

function parseEquipment(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }
}

export function RoomCard({ room, showReserveButton = false, onReserved }: RoomCardProps) {
  const [reserveOpen, setReserveOpen] = useState(false);
  const equipment = parseEquipment(room.equipment ?? '[]');

  return (
    <>
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-gray-800">{room.code}</p>
            <p className="text-sm text-gray-500">{room.name}</p>
          </div>
          <Badge variant="success">AVAILABLE</Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Building2 size={13} /> Building
          </span>
          <span className="flex items-center gap-1">
            <Layers size={13} /> Floor {room.floor}
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} /> Cap. {room.capacity}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="primary">{room.type.replace('_', ' ')}</Badge>
        </div>

        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {equipment.map((eq) => (
              <Badge key={eq} variant="gray">
                {eq}
              </Badge>
            ))}
          </div>
        )}

        {showReserveButton && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-1"
            onClick={() => setReserveOpen(true)}
          >
            Reserve
          </Button>
        )}
      </Card>

      <ReservationModal
        open={reserveOpen}
        room={room}
        onClose={() => setReserveOpen(false)}
        onSuccess={() => {
          setReserveOpen(false);
          onReserved?.();
        }}
      />
    </>
  );
}

export default RoomCard;
