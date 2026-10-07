import type { Room } from '@/types';
import { ROOM_STATUS_CONFIG } from './statusConfig';

export interface RoomMarkerProps {
  room: Room;
  /** Horizontal position as a percentage (0-100) of the blueprint width. */
  x: number;
  /** Vertical position as a percentage (0-100) of the blueprint height. */
  y: number;
  highlighted?: boolean;
  onSelect: (room: Room) => void;
}

/**
 * Individual room marker rendered over the campus blueprint.
 * Keyboard-focusable (Enter activates), exposes an ARIA label of
 * "room code, status", and shows a hover tooltip with the room name
 * and current status text (not just the colour).
 */
export function RoomMarker({ room, x, y, highlighted, onSelect }: RoomMarkerProps) {
  const cfg = ROOM_STATUS_CONFIG[room.status];
  const Icon = cfg.icon;

  return (
    <button
      type="button"
      aria-label={`${room.code}, ${cfg.label}`}
      title={`${room.name} — ${cfg.label}`}
      onClick={() => onSelect(room)}
      style={{ left: `${x}%`, top: `${y}%` }}
      className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center focus:outline-none"
    >
      <span
        className={`flex items-center justify-center rounded-full border-2 border-white text-white shadow-md transition-transform ${
          highlighted ? 'scale-125 ring-2 ring-primary-600' : 'group-hover:scale-110'
        }`}
        style={{ backgroundColor: cfg.color, width: 30, height: 30 }}
      >
        <Icon size={16} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span
        className="mt-0.5 whitespace-nowrap rounded bg-white/90 px-1 text-[10px] font-semibold text-gray-800"
        aria-hidden="true"
      >
        {room.code}
      </span>
    </button>
  );
}

export default RoomMarker;
