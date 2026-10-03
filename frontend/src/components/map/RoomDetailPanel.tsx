import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, CalendarPlus, Flag, DoorOpen, Users, Wrench } from 'lucide-react';
import type { Room, DayOfWeek, ComplaintCategory, ComplaintPriority } from '@/types';
import { ROOM_STATUS_CONFIG, parseEquipment } from './statusConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { reservationsApi, complaintsApi } from '@/api/endpoints';
import client from '@/api/client';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Skeleton from '@/components/ui/Skeleton';

interface TimetableRow {
  id: string;
  period: number;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  subject?: { code: string; name: string };
  faculty?: { name: string };
}

const DAY_BY_INDEX: Record<number, DayOfWeek> = {
  1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
};
const todayDay = (): DayOfWeek | undefined => DAY_BY_INDEX[new Date().getDay()];

const ROOM_TYPES: { label: string; value: string }[] = [
  { label: 'Classroom', value: 'CLASSROOM' }, { label: 'Lab', value: 'LAB' },
  { label: 'Seminar Hall', value: 'SEMINAR_HALL' }, { label: 'Auditorium', value: 'AUDITORIUM' },
  { label: 'Library', value: 'LIBRARY' }, { label: 'Office', value: 'OFFICE' },
  { label: 'Other', value: 'OTHER' },
];

const CATEGORIES: { label: string; value: ComplaintCategory }[] = [
  'EQUIPMENT', 'PROJECTOR', 'COMPUTER', 'AC', 'FAN_LIGHT', 'WATER',
  'RESTROOM', 'NETWORK', 'CLASSROOM_DAMAGE', 'ELECTRICAL', 'OTHER',
].map((c) => ({ label: c.replace('_', ' '), value: c as ComplaintCategory }));

const PRIORITIES: { label: string; value: ComplaintPriority }[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  .map((p) => ({ label: p, value: p as ComplaintPriority }));

export interface RoomDetailPanelProps {
  room: Room | null;
  onClose: () => void;
}

export function RoomDetailPanel({ room, onClose }: RoomDetailPanelProps) {
  const { user } = useAuth();
  const { push } = useToast();
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const canReserve = user?.role === 'FACULTY' || user?.role === 'ADMIN';

  const occupancy = useQuery<TimetableRow[]>({
    queryKey: ['room-timetable', room?.id],
    queryFn: async () => {
      const res = await client.get('/timetable/entries', { params: { roomId: room!.id } });
      return (res.data?.data ?? res.data) as TimetableRow[];
    },
    enabled: !!room,
    staleTime: 60 * 1000,
  });

  const today = todayDay();
  const todayClasses = (occupancy.data ?? [])
    .filter((e) => e.day === today)
    .sort((a, b) => a.period - b.period);

  if (!room) return null;
  const cfg = ROOM_STATUS_CONFIG[room.status];
  const StatusIcon = cfg.icon;
  const equipment = parseEquipment(room.equipment);
  const typeLabel = ROOM_TYPES.find((t) => t.value === room.type)?.label ?? room.type;

  const reserve = useMutation({
    mutationFn: (body: { date: string; periodStart: number; periodEnd: number; reason: string }) =>
      reservationsApi.create({ roomId: room.id, type: 'SINGLE', ...body }),
    onSuccess: () => { push('Reservation request submitted', 'success'); setReserveOpen(false); },
    onError: () => push('Could not create reservation', 'error'),
  });

  return (
    <aside
      className="fixed right-0 top-0 z-30 h-full w-full max-w-md transform overflow-y-auto border-l border-gray-200 bg-white shadow-xl transition-transform duration-300"
      style={{ transform: 'translateX(0)' }}
      aria-label="Room details"
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{room.code}</h2>
          <p className="text-sm text-gray-500">{room.name}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close details" className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white" style={{ backgroundColor: cfg.color }}>
            <StatusIcon size={14} /> {cfg.label}
          </span>
          <Badge variant="primary">{typeLabel}</Badge>
          {room.department && <Badge variant="gray">{room.department}</Badge>}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Info icon={<Users size={14} />} label="Capacity" value={String(room.capacity)} />
          <Info icon={<DoorOpen size={14} />} label="Floor" value={String(room.floor)} />
        </dl>

        {equipment.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Equipment</p>
            <div className="flex flex-wrap gap-1.5">
              {equipment.map((e) => (
                <span key={e} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{e}</span>
              ))}
            </div>
          </div>
        )}

        {room.accessibility && (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
            <span className="font-medium">Accessibility: </span>{room.accessibility}
          </div>
        )}

        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500">
            <Wrench size={14} /> Today&rsquo;s schedule
          </p>
          {occupancy.isLoading ? (
            <Skeleton shape="text" count={2} />
          ) : todayClasses.length === 0 ? (
            <p className="text-sm text-gray-500">No classes scheduled today.</p>
          ) : (
            <ul className="space-y-1">
              {todayClasses.map((c) => (
                <li key={c.id} className="flex justify-between rounded-md bg-gray-50 px-3 py-1.5 text-sm">
                  <span>P{c.period} · {c.subject?.code ?? '—'}</span>
                  <span className="text-gray-500">{c.faculty?.name ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          {canReserve && (
            <Button size="sm" leftIcon={<CalendarPlus size={15} />} onClick={() => setReserveOpen(true)}>
              Reserve
            </Button>
          )}
          <Button size="sm" variant="secondary" leftIcon={<Flag size={15} />} onClick={() => setReportOpen(true)}>
            Report Issue
          </Button>
        </div>
      </div>

      <ReserveModal open={reserveOpen} onClose={() => setReserveOpen(false)} onSubmit={(v) => reserve.mutate(v)} loading={reserve.isPending} />
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        room={room}
      />
    </aside>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2">
      <span className="text-gray-400">{icon}</span>
      <div>
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="font-medium text-gray-800">{value}</dd>
      </div>
    </div>
  );
}

const PERIOD_OPTS = Array.from({ length: 8 }, (_, i) => ({ label: `Period ${i + 1}`, value: i + 1 }));

function ReserveModal({ open, onClose, onSubmit, loading }: {
  open: boolean; onClose: () => void;
  onSubmit: (v: { date: string; periodStart: number; periodEnd: number; reason: string }) => void;
  loading: boolean;
}) {
  const [date, setDate] = useState('');
  const [periodStart, setPeriodStart] = useState(1);
  const [periodEnd, setPeriodEnd] = useState(1);
  const [reason, setReason] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Reserve Room" size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={loading} onClick={() => date && reason && onSubmit({ date, periodStart, periodEnd, reason })}>Confirm</Button>
        </>
      }>
      <div className="space-y-3">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="From" options={PERIOD_OPTS} value={String(periodStart)} onChange={(e) => setPeriodStart(Number(e.target.value))} />
          <Select label="To" options={PERIOD_OPTS} value={String(periodEnd)} onChange={(e) => setPeriodEnd(Number(e.target.value))} />
        </div>
        <Textarea label="Reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}

function ReportModal({ open, onClose, room }: { open: boolean; onClose: () => void; room: Room }) {
  const { push } = useToast();
  const [category, setCategory] = useState<ComplaintCategory>('EQUIPMENT');
  const [priority, setPriority] = useState<ComplaintPriority>('MEDIUM');
  const [description, setDescription] = useState('');

  const mut = useMutation({
    mutationFn: () => complaintsApi.file({ category, priority, description, buildingId: room.buildingId, floorId: room.floorId, roomId: room.id }),
    onSuccess: () => { push('Complaint registered', 'success'); onClose(); setDescription(''); },
    onError: () => push('Could not register complaint', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Report an Issue" size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={mut.isPending} onClick={() => description.length >= 5 && mut.mutate()}>Submit</Button>
        </>
      }>
      <div className="space-y-3">
        <Select label="Category" options={CATEGORIES} value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)} />
        <Select label="Priority" options={PRIORITIES} value={priority} onChange={(e) => setPriority(e.target.value as ComplaintPriority)} />
        <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} helperText="Minimum 5 characters" />
      </div>
    </Modal>
  );
}

export default RoomDetailPanel;
