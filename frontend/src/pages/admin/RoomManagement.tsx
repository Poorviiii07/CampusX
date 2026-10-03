import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, MapPin, SlidersHorizontal } from 'lucide-react';
import type { Building, Department, Floor, Room, RoomStatus, RoomType } from '@/types';
import { buildingsApi, departmentsApi } from '@/api/endpoints';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Table, { type Column } from '@/components/ui/Table';
import Badge, { RoomStatusBadge } from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import RoomFormModal from './RoomFormModal';

interface RoomRow extends Room {
  building?: { name: string; code: string };
  floorRelation?: { name: string; floorNumber: number };
}

const TYPES: { label: string; value: RoomType }[] = [
  'CLASSROOM', 'LAB', 'FACULTY_CABIN', 'OFFICE', 'RESTROOM', 'STAFF_ROOM',
  'SEMINAR_HALL', 'AUDITORIUM', 'LIBRARY', 'OTHER',
].map((t) => ({ label: t.replace('_', ' '), value: t as RoomType }));
const STATUSES: { label: string; value: RoomStatus }[] = [
  'AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED', 'TEMP_UNAVAILABLE',
].map((s) => ({ label: s.replace('_', ' '), value: s as RoomStatus }));

export default function RoomManagement() {
  const qc = useQueryClient();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [filters, setFilters] = useState({
    buildingId: params.get('buildingId') ?? '',
    floorId: '', type: '', status: '', department: '',
  });
  const [addOpen, setAddOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [statusTarget, setStatusTarget] = useState<RoomRow | null>(null);
  const [newStatus, setNewStatus] = useState<RoomStatus>('AVAILABLE');
  const [reason, setReason] = useState('');

  const buildings = useQuery<Building[]>({ queryKey: ['buildings'], queryFn: () => buildingsApi.list() });
  const departments = useQuery<Department[]>({ queryKey: ['departments'], queryFn: () => departmentsApi.list() });
  const floors = useQuery<Floor[]>({
    queryKey: ['floors', filters.buildingId],
    queryFn: () => buildingsApi.listFloors(filters.buildingId),
    enabled: !!filters.buildingId,
  });

  const rooms = useQuery<RoomRow[]>({
    queryKey: ['rooms', filters],
    queryFn: async () => {
      const p: Record<string, string> = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
      const res = await client.get('/rooms', { params: p });
      return (res.data?.data ?? res.data) as RoomRow[];
    },
  });

  const statusMut = useMutation({
    mutationFn: () => client.patch(`/rooms/${statusTarget!.id}/status`, { status: newStatus, reason }),
    onSuccess: () => { push('Room status updated', 'success'); qc.invalidateQueries({ queryKey: ['rooms'] }); qc.invalidateQueries({ queryKey: ['all-rooms'] }); setStatusTarget(null); setReason(''); },
    onError: () => push('Could not update status', 'error'),
  });

  const columns: Column<RoomRow>[] = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-medium text-gray-800">{r.code}</span> },
    { key: 'name', header: 'Name', render: (r) => r.name },
    { key: 'type', header: 'Type', render: (r) => <Badge variant="gray">{r.type.replace('_', ' ')}</Badge> },
    { key: 'status', header: 'Status', render: (r) => <RoomStatusBadge status={r.status} /> },
    { key: 'capacity', header: 'Capacity', render: (r) => String(r.capacity) },
    { key: 'loc', header: 'Building / Floor', render: (r) => `${r.building?.code ?? '—'} · Fl ${r.floor}` },
    {
      key: 'actions', header: 'Actions',
      render: (r) => (
        <div className="flex gap-1">
          <IconBtn title="Edit Status" onClick={() => { setStatusTarget(r); setNewStatus(r.status); setReason(''); }}><SlidersHorizontal size={15} /></IconBtn>
          <IconBtn title="Edit Details" onClick={() => setEditRoom(r)}><Pencil size={15} /></IconBtn>
          <IconBtn title="View on Map" onClick={() => navigate('/campus-map')}><MapPin size={15} /></IconBtn>
        </div>
      ),
    },
  ];

  function updateFilter<K extends keyof typeof filters>(key: K, value: string) {
    const next = { ...filters, [key]: value };
    if (key === 'buildingId') next.floorId = '';
    setFilters(next);
    const sp = new URLSearchParams();
    if (next.buildingId) sp.set('buildingId', next.buildingId);
    setParams(sp, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Room Management</h1>
        <Button size="sm" leftIcon={<Plus size={15} />} onClick={() => setAddOpen(true)}>Add Room</Button>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Select placeholder="All buildings" options={(buildings.data ?? []).map((b) => ({ label: b.name, value: b.id }))} value={filters.buildingId} onChange={(e) => updateFilter('buildingId', e.target.value)} />
          <Select placeholder="All floors" disabled={!filters.buildingId} options={(floors.data ?? []).map((f) => ({ label: `Floor ${f.floorNumber}`, value: f.id }))} value={filters.floorId} onChange={(e) => updateFilter('floorId', e.target.value)} />
          <Select placeholder="All types" options={TYPES} value={filters.type} onChange={(e) => updateFilter('type', e.target.value)} />
          <Select placeholder="All statuses" options={STATUSES} value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} />
          <Select placeholder="All departments" options={(departments.data ?? []).map((d) => ({ label: d.name, value: d.code }))} value={filters.department} onChange={(e) => updateFilter('department', e.target.value)} />
        </div>
      </Card>

      <Card className="p-4">
        {rooms.isLoading ? <Skeleton shape="row" count={6} /> : (
          <Table columns={columns} data={rooms.data ?? []} rowKey={(r) => r.id} emptyMessage="No rooms match the current filters" />
        )}
      </Card>

      <RoomFormModal open={addOpen} onClose={() => setAddOpen(false)} defaultBuildingId={filters.buildingId} />
      <RoomFormModal open={!!editRoom} onClose={() => setEditRoom(null)} room={editRoom} defaultBuildingId={filters.buildingId} />

      <Modal open={!!statusTarget} onClose={() => setStatusTarget(null)} title={`Edit status · ${statusTarget?.code ?? ''}`} size="sm"
        footer={<>
          <Button variant="ghost" size="sm" onClick={() => setStatusTarget(null)}>Cancel</Button>
          <Button size="sm" loading={statusMut.isPending} onClick={() => statusTarget && statusMut.mutate()}>Update</Button>
        </>}>
        <div className="space-y-3">
          <Select label="Status" options={STATUSES} value={newStatus} onChange={(e) => setNewStatus(e.target.value as RoomStatus)} />
          <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for status change" />
        </div>
      </Modal>
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-primary-700">
      {children}
    </button>
  );
}
