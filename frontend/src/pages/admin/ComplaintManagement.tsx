import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench, Projector, Monitor, Wind, Lightbulb, Droplet, DoorClosed,
  Wifi, Zap, Hammer, HelpCircle, ChevronDown, ChevronUp, type LucideIcon,
} from 'lucide-react';
import type { Building, Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@/types';
import { buildingsApi } from '@/api/endpoints';
import client from '@/api/client';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Badge, { ComplaintStatusBadge } from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import ComplaintDetailRow from './ComplaintDetailRow';

interface ComplaintRow extends Complaint {
  reporter?: { name: string; email: string; role: string };
  assignedTo?: { name: string; email: string };
  building?: { name: string };
  room?: { code: string; name: string };
}

const CATEGORY_ICON: Record<ComplaintCategory, LucideIcon> = {
  EQUIPMENT: Wrench, PROJECTOR: Projector, COMPUTER: Monitor, AC: Wind,
  FAN_LIGHT: Lightbulb, WATER: Droplet, RESTROOM: DoorClosed, NETWORK: Wifi,
  CLASSROOM_DAMAGE: Hammer, ELECTRICAL: Zap, OTHER: HelpCircle,
};
const CATEGORIES: { label: string; value: ComplaintCategory }[] = Object.keys(CATEGORY_ICON)
  .map((c) => ({ label: c.replace('_', ' '), value: c as ComplaintCategory }));
const STATUSES: { label: string; value: ComplaintStatus }[] = [
  'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED',
].map((s) => ({ label: s.replace('_', ' '), value: s as ComplaintStatus }));
const PRIORITIES: { label: string; value: ComplaintPriority }[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  .map((p) => ({ label: p, value: p as ComplaintPriority }));

const priorityVariant: Record<ComplaintPriority, 'gray' | 'warning' | 'danger'> = {
  LOW: 'gray', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger',
};

export default function ComplaintManagement() {
  const [filters, setFilters] = useState({ status: '', category: '', buildingId: '', priority: '', from: '', to: '' });
  const [expanded, setExpanded] = useState<string | null>(null);

  const buildings = useQuery<Building[]>({ queryKey: ['buildings'], queryFn: () => buildingsApi.list() });

  const complaints = useQuery<ComplaintRow[]>({
    queryKey: ['complaints', filters.status, filters.category, filters.buildingId],
    queryFn: async () => {
      const p: Record<string, string> = {};
      if (filters.status) p.status = filters.status;
      if (filters.category) p.category = filters.category;
      if (filters.buildingId) p.buildingId = filters.buildingId;
      const res = await client.get('/complaints', { params: p });
      return (res.data?.data ?? res.data) as ComplaintRow[];
    },
  });

  const stats = useQuery<{ byStatus: { status: ComplaintStatus; count: number }[] }>({
    queryKey: ['complaint-stats'],
    queryFn: async () => { const res = await client.get('/complaints/stats'); return (res.data?.data ?? res.data) as { byStatus: { status: ComplaintStatus; count: number }[] }; },
  });

  const filtered = useMemo(() => {
    let list = complaints.data ?? [];
    if (filters.priority) list = list.filter((c) => c.priority === filters.priority);
    if (filters.from) list = list.filter((c) => c.createdAt.slice(0, 10) >= filters.from);
    if (filters.to) list = list.filter((c) => c.createdAt.slice(0, 10) <= filters.to);
    return list;
  }, [complaints.data, filters]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    (stats.data?.byStatus ?? []).forEach((s) => { m[s.status] = s.count; });
    return m;
  }, [stats.data]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Complaint Management</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {STATUSES.map((s) => (
          <Card key={s.value} className="px-3 py-2">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-bold text-gray-800">{statusCounts[s.value] ?? 0}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          <Select placeholder="All statuses" options={STATUSES} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} />
          <Select placeholder="All categories" options={CATEGORIES} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
          <Select placeholder="All buildings" options={(buildings.data ?? []).map((b) => ({ label: b.name, value: b.id }))} value={filters.buildingId} onChange={(e) => setFilters({ ...filters, buildingId: e.target.value })} />
          <Select placeholder="All priorities" options={PRIORITIES} value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} />
          <input type="date" aria-label="From date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="rounded-md border border-gray-300 px-2 py-2 text-sm" />
          <input type="date" aria-label="To date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="rounded-md border border-gray-300 px-2 py-2 text-sm" />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {complaints.isLoading ? <div className="p-4"><Skeleton shape="row" count={5} /></div> : complaints.isError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-danger-600 mb-3">Failed to load complaints.</p>
            <button type="button" className="text-sm text-primary-700 hover:underline" onClick={() => complaints.refetch()}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No complaints match the filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['ID', 'Category', 'Location', 'Reported by', 'Priority', 'Status', 'Created', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const CatIcon = CATEGORY_ICON[c.category];
                  const isOpen = expanded === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(isOpen ? null : c.id)}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{c.autoId}</td>
                        <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-gray-600"><CatIcon size={15} /> {c.category.replace('_', ' ')}</span></td>
                        <td className="px-4 py-3 text-gray-600">{[c.building?.name, c.room?.code].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{c.reporter?.name ?? '—'}</td>
                        <td className="px-4 py-3"><Badge variant={priorityVariant[c.priority]}>{c.priority}</Badge></td>
                        <td className="px-4 py-3"><ComplaintStatusBadge status={c.status} /></td>
                        <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-gray-400">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                      </tr>
                      {isOpen && <tr><ComplaintDetailRow complaint={c} /></tr>}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
