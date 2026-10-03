import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Plus } from 'lucide-react';
import type { Building, Department, Floor, Room, RoomType, RoomStatus } from '@/types';
import { buildingsApi, departmentsApi } from '@/api/endpoints';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';

const ROOM_TYPES: { label: string; value: RoomType }[] = [
  'CLASSROOM', 'LAB', 'FACULTY_CABIN', 'OFFICE', 'RESTROOM', 'STAFF_ROOM',
  'SEMINAR_HALL', 'AUDITORIUM', 'LIBRARY', 'OTHER',
].map((t) => ({ label: t.replace('_', ' '), value: t as RoomType }));

export interface RoomFormModalProps {
  open: boolean;
  onClose: () => void;
  room?: Room | null;
  defaultBuildingId?: string;
}

interface FormState {
  code: string; name: string; type: RoomType; capacity: number;
  buildingId: string; floorId: string; department: string;
  equipment: string[]; accessibility: string; coordinatesX: string; coordinatesY: string;
}

const blank: FormState = {
  code: '', name: '', type: 'CLASSROOM', capacity: 40, buildingId: '',
  floorId: '', department: '', equipment: [], accessibility: '', coordinatesX: '', coordinatesY: '',
};

function toForm(room: Room): FormState {
  let eq: string[] = [];
  try { const p = JSON.parse(room.equipment); if (Array.isArray(p)) eq = p.map(String); } catch { /* ignore */ }
  return {
    code: room.code, name: room.name, type: room.type, capacity: room.capacity,
    buildingId: room.buildingId, floorId: room.floorId, department: room.department ?? '',
    equipment: eq, accessibility: room.accessibility ?? '',
    coordinatesX: room.coordinatesX != null ? String(room.coordinatesX) : '',
    coordinatesY: room.coordinatesY != null ? String(room.coordinatesY) : '',
  };
}

export default function RoomFormModal({ open, onClose, room, defaultBuildingId }: RoomFormModalProps) {
  const qc = useQueryClient();
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(blank);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(room ? toForm(room) : { ...blank, buildingId: defaultBuildingId ?? '' });
    setTagInput('');
  }, [open, room, defaultBuildingId]);

  const buildings = useQuery<Building[]>({ queryKey: ['buildings'], queryFn: () => buildingsApi.list() });
  const departments = useQuery<Department[]>({ queryKey: ['departments'], queryFn: () => departmentsApi.list() });
  const floors = useQuery<Floor[]>({
    queryKey: ['floors', form.buildingId],
    queryFn: () => buildingsApi.listFloors(form.buildingId),
    enabled: !!form.buildingId,
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code, name: form.name, type: form.type, capacity: Number(form.capacity),
        buildingId: form.buildingId, floorId: form.floorId,
        floor: floors.data?.find((f) => f.id === form.floorId)?.floorNumber ?? 0,
        department: form.department || undefined,
        equipment: form.equipment, accessibility: form.accessibility || undefined,
        coordinatesX: form.coordinatesX ? Number(form.coordinatesX) : undefined,
        coordinatesY: form.coordinatesY ? Number(form.coordinatesY) : undefined,
        status: room?.status as RoomStatus | undefined,
      };
      if (room) return client.put(`/rooms/${room.id}`, payload);
      return client.post('/rooms', payload);
    },
    onSuccess: () => {
      push(room ? 'Room updated' : 'Room created', 'success');
      qc.invalidateQueries({ queryKey: ['rooms'] });
      qc.invalidateQueries({ queryKey: ['all-rooms'] });
      onClose();
    },
    onError: () => push('Could not save room', 'error'),
  });

  function addTag() {
    const t = tagInput.trim();
    if (t && !form.equipment.includes(t)) setForm({ ...form, equipment: [...form.equipment, t] });
    setTagInput('');
  }

  return (
    <Modal open={open} onClose={onClose} title={room ? 'Edit Room' : 'Add Room'} size="lg"
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" loading={saveMut.isPending} onClick={() => form.code && form.name && form.buildingId && form.floorId && saveMut.mutate()}>
          {room ? 'Save' : 'Create'}
        </Button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CSE-201" />
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Classroom 201" />
        <Select label="Type" options={ROOM_TYPES} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RoomType })} />
        <Input label="Capacity" type="number" min={0} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
        <Select label="Building" placeholder="Select building" options={(buildings.data ?? []).map((b) => ({ label: b.name, value: b.id }))} value={form.buildingId} onChange={(e) => setForm({ ...form, buildingId: e.target.value, floorId: '' })} />
        <Select label="Floor" placeholder="Select floor" disabled={!form.buildingId} options={(floors.data ?? []).map((f) => ({ label: `Floor ${f.floorNumber}`, value: f.id }))} value={form.floorId} onChange={(e) => setForm({ ...form, floorId: e.target.value })} />
        <Select label="Department" placeholder="None" options={(departments.data ?? []).map((d) => ({ label: d.name, value: d.code }))} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <Input label="Coordinates X (0-100)" type="number" value={form.coordinatesX} onChange={(e) => setForm({ ...form, coordinatesX: e.target.value })} />
        <Input label="Coordinates Y (0-100)" type="number" value={form.coordinatesY} onChange={(e) => setForm({ ...form, coordinatesY: e.target.value })} />
      </div>

      <div className="mt-3">
        <span className="text-sm font-medium text-gray-700">Equipment</span>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1.5">
          {form.equipment.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => setForm({ ...form, equipment: form.equipment.filter((x) => x !== t) })}>
                <X size={12} className="text-gray-400 hover:text-danger-600" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="Type and press Enter"
            className="min-w-[120px] flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      <Textarea label="Accessibility" rows={2} value={form.accessibility} onChange={(e) => setForm({ ...form, accessibility: e.target.value })} className="mt-3" />
    </Modal>
  );
}
