import { STATUS_ORDER, ROOM_STATUS_CONFIG } from './statusConfig';

/**
 * Legend bar shown at the bottom of the campus map. Lists every room
 * status with a colour swatch, icon and a text label (not just colour).
 */
export function StatusLegend() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-lg border border-gray-200 bg-white/95 px-4 py-2 shadow-sm"
      role="list"
      aria-label="Room status legend"
    >
      {STATUS_ORDER.map((status) => {
        const cfg = ROOM_STATUS_CONFIG[status];
        const Icon = cfg.icon;
        return (
          <div key={status} role="listitem" className="flex items-center gap-1.5">
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full"
              style={{ backgroundColor: cfg.color }}
              aria-hidden="true"
            >
              <Icon size={10} className="text-white" strokeWidth={2.5} />
            </span>
            <span className="text-xs font-medium text-gray-700">{cfg.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default StatusLegend;
