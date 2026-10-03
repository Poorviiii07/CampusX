import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Building2 } from 'lucide-react';
import type { Building, Floor, Room, RoomType } from '@/types';
import { buildingsApi, roomsApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { PUBLIC_ROOM_TYPES, ROOM_STATUS_CONFIG } from '@/components/map/statusConfig';
import RoomMarker from '@/components/map/RoomMarker';
import RoomDetailPanel from '@/components/map/RoomDetailPanel';
import StatusLegend from '@/components/map/StatusLegend';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

interface BuildingWithCount extends Building {
  _count?: { floors?: number; rooms?: number };
}
interface FloorWithCount extends Floor {
  _count?: { rooms?: number };
}
interface RoomWithRelations extends Room {
  building?: { name: string; code: string };
  floorRelation?: { name: string; floorNumber: number };
}

export default function CampusMap() {
  const { user } = useAuth();
  const isGuest = user?.role === 'GUEST';
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  const buildings = useQuery<BuildingWithCount[]>({
    queryKey: ['buildings'],
    queryFn: () => buildingsApi.list(),
  });

  const floors = useQuery<FloorWithCount[]>({
    queryKey: ['floors', selectedBuildingId],
    queryFn: () => buildingsApi.listFloors(selectedBuildingId!),
    enabled: !!selectedBuildingId,
  });

  const rooms = useQuery<RoomWithRelations[]>({
    queryKey: ['rooms', selectedBuildingId],
    queryFn: () => roomsApi.list({ buildingId: selectedBuildingId! }),
    enabled: !!selectedBuildingId,
  });

  // Auto-select first building, then first floor
  const buildingList = buildings.data ?? [];
  const effectiveBuildingId = selectedBuildingId ?? buildingList[0]?.id ?? null;
  const floorList = (floors.data ?? []).sort((a, b) => a.floorNumber - b.floorNumber);
  const effectiveFloorId = selectedFloorId ?? floorList[0]?.id ?? null;
  const selectedFloor = floorList.find((f) => f.id === effectiveFloorId) ?? null;

  const visibleRooms = useMemo(() => {
    let list = (rooms.data ?? []).filter((r) => r.floorId === effectiveFloorId);
    if (isGuest) list = list.filter((r) => PUBLIC_ROOM_TYPES.includes(r.type as RoomType));
    return list;
  }, [rooms.data, effectiveFloorId, isGuest]);

  const matches = (r: Room) => {
    if (!search.trim()) return false;
    const q = search.trim().toLowerCase();
    return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
  };
  const matchedIds = new Set(visibleRooms.filter(matches).map((r) => r.id));

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:h-[calc(100vh-9rem)]">
      {/* Left: building selector */}
      <div className="w-full lg:w-72 lg:shrink-0 lg:overflow-y-auto">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Building2 size={16} /> Buildings
        </h2>
        {buildings.isLoading ? (
          <Skeleton shape="card" count={3} />
        ) : buildingList.length === 0 ? (
          <EmptyState title="No buildings" description="Buildings will appear here once configured." />
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {buildingList.map((b) => {
              const active = b.id === effectiveBuildingId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setSelectedBuildingId(b.id); setSelectedFloorId(null); }}
                  className={`text-left rounded-xl border p-3 transition-colors ${active ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-600' : 'border-gray-200 bg-white hover:border-primary-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{b.name}</span>
                    <Badge variant="gray">{b.code}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {b._count?.floors ?? b.totalFloors} floors · {b._count?.rooms ?? 0} rooms
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Center: floor tabs + blueprint/grid */}
      <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms by code or name…"
              aria-label="Search rooms"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {floorList.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFloorId(f.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${f.id === effectiveFloorId ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Floor {f.floorNumber}
              </button>
            ))}
            {floorList.length === 0 && !floors.isLoading && (
              <span className="text-sm text-gray-400">No floors</span>
            )}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden p-4">
          {!effectiveBuildingId ? (
            <EmptyState icon={<MapPin size={48} />} title="Select a building" description="Choose a building to view its floors and rooms." />
          ) : floors.isLoading || rooms.isLoading ? (
            <Skeleton shape="card" count={6} />
          ) : visibleRooms.length === 0 ? (
            <EmptyState title="No rooms on this floor" description="Try another floor or building." />
          ) : selectedFloor?.blueprintUrl ? (
            <BlueprintView rooms={visibleRooms} blueprintUrl={selectedFloor.blueprintUrl} matchedIds={matchedIds} onSelect={setActiveRoom} />
          ) : (
            <RoomGrid rooms={visibleRooms} matchedIds={matchedIds} onSelect={setActiveRoom} />
          )}
        </div>

        <div className="px-4 pb-4">
          <StatusLegend />
        </div>
      </div>

      {/* Right: detail panel */}
      {activeRoom && <RoomDetailPanel room={activeRoom} onClose={() => setActiveRoom(null)} />}
    </div>
  );
}

function BlueprintView({ rooms, blueprintUrl, matchedIds, onSelect }: {
  rooms: Room[]; blueprintUrl: string; matchedIds: Set<string>; onSelect: (r: Room) => void;
}) {
  const hasCoords = rooms.some((r) => r.coordinatesX != null && r.coordinatesY != null);
  return (
    <div className="relative h-full w-full">
      <img src={blueprintUrl} alt="Floor blueprint" className="h-full w-full rounded-lg border border-gray-200 object-contain" />
      <div className="absolute inset-0">
        {rooms
          .filter((r) => r.coordinatesX != null && r.coordinatesY != null)
          .map((r) => (
            <RoomMarker
              key={r.id}
              room={r}
              x={r.coordinatesX!}
              y={r.coordinatesY!}
              highlighted={matchedIds.has(r.id)}
              onSelect={onSelect}
            />
          ))}
      </div>
      {!hasCoords && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            Room coordinates not set — showing marker positions only
          </span>
        </div>
      )}
    </div>
  );
}

function RoomGrid({ rooms, matchedIds, onSelect }: {
  rooms: Room[]; matchedIds: Set<string>; onSelect: (r: Room) => void;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
      {rooms.map((r) => {
        const cfg = ROOM_STATUS_CONFIG[r.status];
        const Icon = cfg.icon;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r)}
            className={`flex flex-col gap-1 rounded-lg border bg-white p-3 text-left transition-colors hover:border-primary-400 ${matchedIds.has(r.id) ? 'border-primary-600 ring-2 ring-primary-200' : 'border-gray-200'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">{r.code}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: cfg.color }}>
                <Icon size={12} className="text-white" strokeWidth={2.5} />
              </span>
            </div>
            <span className="text-xs text-gray-500">{r.name}</span>
            <div className="flex items-center gap-1.5">
              <Badge variant="gray">{r.type.replace('_', ' ')}</Badge>
              <span className="text-xs text-gray-500">Cap {r.capacity}</span>
            </div>
            <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
