import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Zap } from 'lucide-react';
import type { RoomType } from '@/types';
import { availabilityApi, buildingsApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import RoomCard from '@/components/rooms/RoomCard';

const ROOM_TYPES: RoomType[] = [
  'CLASSROOM', 'LAB', 'SEMINAR_HALL', 'AUDITORIUM', 'FACULTY_CABIN', 'OFFICE', 'STAFF_ROOM', 'LIBRARY', 'OTHER',
];

const EQUIPMENT_OPTIONS = ['Projector', 'Smart Board', 'AC', 'Computer Lab'];

const PERIOD_OPTIONS = Array.from({ length: 8 }, (_, i) => ({ label: `Period ${i + 1}`, value: i + 1 }));

function currentPeriod(): number {
  const h = new Date().getHours();
  if (h < 8) return 1;
  if (h < 9) return 1;
  if (h < 10) return 2;
  if (h < 11) return 3;
  if (h < 12) return 4;
  if (h < 13) return 5;
  if (h < 14) return 6;
  if (h < 15) return 7;
  return 8;
}

interface Filters {
  date: string;
  period: string;
  minCapacity: string;
  roomType: string;
  buildingId: string;
  equipment: string[];
}

const defaultFilters: Filters = {
  date: '',
  period: '',
  minCapacity: '',
  roomType: '',
  buildingId: '',
  equipment: [],
};

export default function FindClassroomPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [submitted, setSubmitted] = useState(false);

  const canReserve = user?.role === 'FACULTY' || user?.role === 'ADMIN';

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingsApi.list({ isActive: true }),
  });

  const { data: rooms, isFetching, refetch } = useQuery({
    queryKey: ['available-rooms', filters],
    queryFn: () =>
      availabilityApi.getRooms({
        date: filters.date || undefined,
        period: filters.period ? Number(filters.period) : undefined,
        minCapacity: filters.minCapacity ? Number(filters.minCapacity) : undefined,
        roomType: (filters.roomType as RoomType) || undefined,
        buildingId: filters.buildingId || undefined,
      }),
    enabled: submitted,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    refetch();
  }

  function handleFindNow() {
    const today = new Date().toISOString().slice(0, 10);
    setFilters((f) => ({ ...f, date: today, period: String(currentPeriod()) }));
    setSubmitted(true);
    setTimeout(() => refetch(), 0);
  }

  function toggleEquipment(eq: string) {
    setFilters((f) => ({
      ...f,
      equipment: f.equipment.includes(eq) ? f.equipment.filter((e) => e !== eq) : [...f.equipment, eq],
    }));
  }

  const buildingOptions = buildings.map((b) => ({ label: b.name, value: b.id }));
  const roomTypeOptions = ROOM_TYPES.map((t) => ({ label: t.replace('_', ' '), value: t }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Find Available Classroom</h1>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Zap size={15} />}
          onClick={handleFindNow}
        >
          Find Available Now
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Date"
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
          <Select
            label="Period"
            options={PERIOD_OPTIONS}
            value={filters.period}
            placeholder="Any period"
            onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
          />
          <Input
            label="Required Capacity"
            type="number"
            min={1}
            value={filters.minCapacity}
            placeholder="e.g. 30"
            onChange={(e) => setFilters((f) => ({ ...f, minCapacity: e.target.value }))}
          />
          <Select
            label="Room Type"
            options={roomTypeOptions}
            value={filters.roomType}
            placeholder="Any type"
            onChange={(e) => setFilters((f) => ({ ...f, roomType: e.target.value }))}
          />
          <Select
            label="Building"
            options={buildingOptions}
            value={filters.buildingId}
            placeholder="Any building"
            onChange={(e) => setFilters((f) => ({ ...f, buildingId: e.target.value }))}
          />
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-sm font-medium text-gray-700">Equipment</p>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <label key={eq} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  checked={filters.equipment.includes(eq)}
                  onChange={() => toggleEquipment(eq)}
                />
                {eq}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="submit" leftIcon={<Search size={15} />} loading={isFetching}>
            Search Rooms
          </Button>
        </div>
      </form>

      {submitted && (
        <div>
          {isFetching ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton shape="card" count={6} />
            </div>
          ) : !rooms || rooms.length === 0 ? (
            <EmptyState
              title="No rooms found"
              description="Try adjusting your filters or check back later."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  showReserveButton={canReserve}
                  onReserved={() => refetch()}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
