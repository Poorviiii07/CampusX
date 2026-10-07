import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import type { RoomReservation } from '@/types';
import { reservationsApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/useToast';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';

const STATUS_VARIANT = {
  ACTIVE: 'success',
  CANCELLED: 'gray',
  EXPIRED: 'warning',
} as const;

function isFuture(dateStr: string) {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

export default function MyReservationsPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState<RoomReservation | null>(null);

  const { data: reservations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => reservationsApi.getMyReservations(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      push('Reservation cancelled', 'success');
      qc.invalidateQueries({ queryKey: ['my-reservations'] });
      setCancelling(null);
    },
    onError: () => push('Failed to cancel reservation', 'error'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">My Reservations</h1>
        <Button
          size="sm"
          leftIcon={<Plus size={15} />}
          onClick={() => navigate('/find-classroom')}
        >
          Reserve New Room
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4"><Skeleton shape="row" count={5} /></div>
        ) : isError ? (
          <EmptyState
            title="Failed to load reservations"
            description="There was an error fetching your reservations."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : reservations.length === 0 ? (
          <EmptyState
            title="No reservations yet"
            description="Reserve a room using the button above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Room', 'Date', 'Periods', 'Reason', 'Class', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {reservations.map((r) => {
                  const res = r as RoomReservation & {
                    room?: { code: string; name: string };
                    class?: { name: string };
                  };
                  return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {res.room?.code ?? r.roomId.slice(0, 8)}
                      {res.room?.name && <span className="block text-xs text-gray-400">{res.room.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.periodStart === r.periodEnd ? `P${r.periodStart}` : `P${r.periodStart}–P${r.periodEnd}`}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{r.reason}</td>
                    <td className="px-4 py-3 text-gray-600">{res.class?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'ACTIVE' && isFuture(r.date) && (
                        <button
                          type="button"
                          title="Cancel reservation"
                          aria-label="Cancel"
                          onClick={() => setCancelling(r)}
                          className="text-danger-500 hover:text-danger-700 rounded p-1"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Cancel Reservation"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCancelling(null)}>Keep</Button>
            <Button variant="danger" size="sm" loading={cancelMutation.isPending} onClick={() => cancelling && cancelMutation.mutate(cancelling.id)}>
              Cancel Reservation
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Cancel reservation for room <span className="font-medium">{(cancelling as any)?.room?.code ?? cancelling?.roomId}</span> on{' '}
          {cancelling && new Date(cancelling.date).toLocaleDateString()}?
        </p>
      </Modal>
    </div>
  );
}
