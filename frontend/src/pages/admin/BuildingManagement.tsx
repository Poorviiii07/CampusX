import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Pencil, DoorOpen, Trash2, Plus, Image } from 'lucide-react';
import type { Building } from '@/types';
import { buildingsApi } from '@/api/endpoints';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Table, { type Column } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';

interface BuildingRow extends Building {
  _count?: { floors: number; rooms: number };
}

const emptyForm = { name: '', code: '', totalFloors: 1, description: '' };

export default function BuildingManagement() {
  const qc = useQueryClient();
  const { push } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<BuildingRow | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<BuildingRow | null>(null);

  const buildings = useQuery<BuildingRow[]>({ queryKey: ['buildings'], queryFn: () => buildingsApi.list() });

  const createMut = useMutation({
    mutationFn: (b: { name: string; code: string; totalFloors: number; description?: string }) =>
      buildingsApi.create(b),
    onSuccess: () => { push('Building created', 'success'); qc.invalidateQueries({ queryKey: ['buildings'] }); setForm(emptyForm); setTab('list'); },
    onError: () => push('Could not create building', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (b: { id: string; name: string; code: string; totalFloors: number; description?: string }) =>
      client.put(`/buildings/${b.id}`, { name: b.name, code: b.code, totalFloors: b.totalFloors, description: b.description }),
    onSuccess: () => { push('Building updated', 'success'); qc.invalidateQueries({ queryKey: ['buildings'] }); setEditing(null); },
    onError: () => push('Could not update building', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => client.delete(`/buildings/${id}`),
    onSuccess: () => { push('Building deactivated', 'success'); qc.invalidateQueries({ queryKey: ['buildings'] }); setDeleting(null); },
    onError: () => push('Could not delete building', 'error'),
  });

  const columns: Column<BuildingRow>[] = [
    { key: 'name', header: 'Building', render: (b) => <span className="font-medium text-gray-800">{b.name}</span> },
    { key: 'code', header: 'Code', render: (b) => <Badge variant="gray">{b.code}</Badge> },
    { key: 'floors', header: 'Floors', render: (b) => String(b._count?.floors ?? b.totalFloors ?? 0) },
    { key: 'rooms', header: 'Rooms', render: (b) => String(b._count?.rooms ?? 0) },
    {
      key: 'actions', header: 'Actions',
      render: (b) => (
        <div className="flex gap-1">
          <IconBtn title="Edit" onClick={() => { setEditing(b); setEditForm({ name: b.name, code: b.code, totalFloors: b.totalFloors, description: b.description ?? '' }); }}>
            <Pencil size={15} />
          </IconBtn>
          <IconBtn title="View Rooms" onClick={() => navigate(`/admin/rooms?buildingId=${b.id}`)}>
            <DoorOpen size={15} />
          </IconBtn>
          <IconBtn title="Blueprints" onClick={() => navigate(`/admin/buildings/${b.id}/blueprints`)}>
            <Image size={15} />
          </IconBtn>
          <IconBtn title="Delete" danger onClick={() => setDeleting(b)}>
            <Trash2 size={15} />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Campus Configuration</h1>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <TabBtn active={tab === 'list'} onClick={() => setTab('list')}>Buildings</TabBtn>
          <TabBtn active={tab === 'add'} onClick={() => setTab('add')}>Add Building</TabBtn>
        </div>
      </div>

      {tab === 'list' ? (
        <Card className="p-4">
          {buildings.isLoading ? <Skeleton shape="row" count={5} /> : buildings.isError ? (
            <div className="py-6 text-center">
              <p className="text-sm text-danger-600 mb-3">Failed to load buildings.</p>
              <Button variant="ghost" size="sm" onClick={() => buildings.refetch()}>Retry</Button>
            </div>
          ) : (
            <Table columns={columns} data={buildings.data ?? []} rowKey={(b) => b.id} />
          )}
        </Card>
      ) : (
        <Card className="max-w-lg p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
            <Plus size={18} /> New Building
          </h2>
          <BuildingForm form={form} setForm={setForm} onSubmit={() => form.name && form.code && createMut.mutate(form)} loading={createMut.isPending} />
        </Card>
      )}

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Building" size="sm"
        footer={<Button size="sm" loading={updateMut.isPending} onClick={() => editing && updateMut.mutate({ ...editForm, id: editing.id })}>Save</Button>}>
        <BuildingForm form={editForm} setForm={setEditForm} onSubmit={() => {}} hideSubmit />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Deactivate Building" size="sm"
        footer={<>
          <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" size="sm" loading={deleteMut.isPending} onClick={() => deleting && deleteMut.mutate(deleting.id)}>Deactivate</Button>
        </>}>
        <p className="text-sm text-gray-600">Deactivating <span className="font-medium">{deleting?.name}</span> hides it from listings. This can be reverted later.</p>
      </Modal>
    </div>
  );
}

function BuildingForm({ form, setForm, onSubmit, loading, hideSubmit }: {
  form: typeof emptyForm; setForm: (f: typeof emptyForm) => void;
  onSubmit: () => void; loading?: boolean; hideSubmit?: boolean;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
      <Input label="Building Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CSE Block" />
      <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. CSE" />
      <Input label="Number of Floors" type="number" min={1} value={form.totalFloors} onChange={(e) => setForm({ ...form, totalFloors: Number(e.target.value) })} />
      <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      {!hideSubmit && <Button type="submit" loading={loading} leftIcon={<Plus size={15} />}>Create Building</Button>}
    </form>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'}`}>
      {children}
    </button>
  );
}

function IconBtn({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} aria-label={title}
      className={`rounded p-1.5 hover:bg-gray-100 ${danger ? 'text-danger-600 hover:bg-danger-50' : 'text-gray-600 hover:text-primary-700'}`}>
      {children}
    </button>
  );
}
