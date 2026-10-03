import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, RefreshCw, Clock } from 'lucide-react';
import type { Complaint, ComplaintStatus } from '@/types';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Skeleton from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';

interface ComplaintRow extends Complaint {
  reporter?: { name: string; email: string; role: string };
  assignedTo?: { name: string; email: string };
  building?: { name: string };
  room?: { code: string; name: string };
}

interface UpdateRow {
  id: string; message: string; statusChange?: ComplaintStatus | null; createdAt: string;
  updatedBy?: { name: string; role: string };
}

const STATUSES: { label: string; value: ComplaintStatus }[] = [
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED',
].map((s) => ({ label: s.replace('_', ' '), value: s as ComplaintStatus }));

export default function ComplaintDetailRow({ complaint }: { complaint: ComplaintRow }) {
  const qc = useQueryClient();
  const { push } = useToast();
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [resolution, setResolution] = useState('');
  const [message, setMessage] = useState('');

  const detail = useQuery<{ updates?: UpdateRow[] }>({
    queryKey: ['complaint', complaint.id],
    queryFn: async () => { const res = await client.get(`/complaints/${complaint.id}`); return (res.data?.data ?? res.data) as { updates?: UpdateRow[] }; },
  });

  const assignMut = useMutation({
    mutationFn: () => client.patch(`/complaints/${complaint.id}/assign`, { assignedToId: assignee }),
    onSuccess: () => { push('Complaint assigned', 'success'); qc.invalidateQueries({ queryKey: ['complaints'] }); qc.invalidateQueries({ queryKey: ['complaint', complaint.id] }); },
    onError: () => push('Could not assign complaint', 'error'),
  });
  const statusMut = useMutation({
    mutationFn: () => client.patch(`/complaints/${complaint.id}/status`, { status, message: message || undefined, resolution: resolution || undefined }),
    onSuccess: () => { push('Status updated', 'success'); qc.invalidateQueries({ queryKey: ['complaints'] }); qc.invalidateQueries({ queryKey: ['complaint', complaint.id] }); setResolution(''); setMessage(''); },
    onError: () => push('Could not update status', 'error'),
  });

  const updates = detail.data?.updates ?? [];

  return (
    <td colSpan={9} className="bg-gray-50 px-4 py-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">Description</p>
            <p className="mt-1 text-sm text-gray-700">{complaint.description}</p>
          </div>
          {complaint.imageUrl && (
            <img src={complaint.imageUrl} alt="Complaint evidence" className="max-h-48 rounded-md border border-gray-200 object-cover" />
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="gray">Reporter: {complaint.reporter?.name ?? '—'}</Badge>
            <Badge variant="gray">Assigned: {complaint.assignedTo?.name ?? 'Unassigned'}</Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500"><Clock size={14} /> Timeline</div>
          {detail.isLoading ? <Skeleton shape="text" count={2} /> : updates.length === 0 ? (
            <p className="text-sm text-gray-500">No updates yet.</p>
          ) : (
            <ol className="space-y-2 border-l border-gray-200 pl-3">
              {updates.map((u) => (
                <li key={u.id}>
                  <p className="text-sm text-gray-700">{u.message}</p>
                  <p className="text-xs text-gray-400">{u.updatedBy?.name ?? '—'} · {new Date(u.createdAt).toLocaleString()}{u.statusChange ? ` → ${u.statusChange}` : ''}</p>
                </li>
              ))}
            </ol>
          )}

          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500"><UserPlus size={14} /> Assign To</p>
            <div className="flex gap-2">
              <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Faculty user ID (UUID)" />
              <Button size="sm" loading={assignMut.isPending} disabled={!assignee} onClick={() => assignMut.mutate()}>Assign</Button>
            </div>
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-500"><RefreshCw size={14} /> Update Status</p>
            <Select options={STATUSES} value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus)} className="mb-2" />
            <Textarea label="Resolution note" rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} className="mb-2" />
            <Input label="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} className="mb-2" />
            <Button size="sm" loading={statusMut.isPending} onClick={() => statusMut.mutate()}>Update Status</Button>
          </div>
        </div>
      </div>
    </td>
  );
}
