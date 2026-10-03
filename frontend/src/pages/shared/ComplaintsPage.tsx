import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Wrench, Monitor, Wind, Lightbulb, Droplets, Wifi, Building2, Zap, MoreHorizontal, Plus,
} from 'lucide-react';
import type { Complaint, ComplaintCategory } from '@/types';
import { complaintsApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import Badge, { ComplaintStatusBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

const CATEGORY_ICONS: Record<ComplaintCategory, React.ReactNode> = {
  EQUIPMENT: <Wrench size={15} />,
  PROJECTOR: <Monitor size={15} />,
  COMPUTER: <Monitor size={15} />,
  AC: <Wind size={15} />,
  FAN_LIGHT: <Lightbulb size={15} />,
  WATER: <Droplets size={15} />,
  RESTROOM: <Droplets size={15} />,
  NETWORK: <Wifi size={15} />,
  CLASSROOM_DAMAGE: <Building2 size={15} />,
  ELECTRICAL: <Zap size={15} />,
  OTHER: <MoreHorizontal size={15} />,
};

const PRIORITY_VARIANT = {
  LOW: 'gray',
  MEDIUM: 'warning',
  HIGH: 'danger',
  CRITICAL: 'danger',
} as const;

function truncate(s: string, n = 60) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export default function ComplaintsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Complaint | null>(null);

  const { data: complaints = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['complaints', user?.id],
    queryFn: () => complaintsApi.list(),
  });

  const myComplaints =
    user?.role === 'STUDENT'
      ? complaints.filter((c) => c.reporterId === user.id)
      : complaints;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Complaints</h1>
        <Button
          size="sm"
          leftIcon={<Plus size={15} />}
          onClick={() => navigate('/faculty/report-issue')}
        >
          File New Complaint
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4">
            <Skeleton shape="row" count={5} />
          </div>
        ) : isError ? (
          <EmptyState
            icon={<AlertTriangle size={40} className="text-danger-400" />}
            title="Failed to load complaints"
            description="There was an error fetching complaints."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : myComplaints.length === 0 ? (
          <EmptyState
            title="No complaints filed"
            description="All clear! Use the button above to report an issue."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Description</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Priority</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {myComplaints.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.autoId}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-gray-700">
                        {CATEGORY_ICONS[c.category]}
                        {c.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {[c.buildingId, c.roomId].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{truncate(c.description)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_VARIANT[c.priority]}>{c.priority}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ComplaintStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ComplaintDetailModal complaint={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ComplaintDetailModal({ complaint, onClose }: { complaint: Complaint | null; onClose: () => void }) {
  if (!complaint) return null;
  return (
    <Modal open={!!complaint} onClose={onClose} title={`Complaint ${complaint.autoId}`} size="lg">
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Category</p>
            <p className="text-gray-800">{complaint.category.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Priority</p>
            <Badge variant={PRIORITY_VARIANT[complaint.priority]}>{complaint.priority}</Badge>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
            <ComplaintStatusBadge status={complaint.status} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Filed</p>
            <p className="text-gray-800">{new Date(complaint.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Description</p>
          <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>
        </div>

        {complaint.imageUrl && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Image</p>
            <img
              src={complaint.imageUrl}
              alt="Complaint attachment"
              className="max-h-48 rounded-lg border border-gray-200 object-contain"
            />
          </div>
        )}

        {complaint.resolution && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Resolution</p>
            <p className="text-gray-700">{complaint.resolution}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
