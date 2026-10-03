import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Check } from 'lucide-react';
import type { Semester, TimetableEntry } from '@/types';
import { timetableApi } from '@/api/endpoints';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';

interface Suggestion {
  entryId: string;
  currentRoom: { id: string; code: string; capacity: number };
  suggestedRoom?: { id: string; code: string; capacity: number };
  reason: string;
  efficiencyGain: number;
}
interface EntryRich extends TimetableEntry {
  class?: { name: string; strength: number };
  room?: { capacity: number; code: string };
}

export default function OptimizationPage() {
  const qc = useQueryClient();
  const { push } = useToast();
  const [analysed, setAnalysed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyOpen, setApplyOpen] = useState(false);

  const semesters = useQuery<Semester[]>({ queryKey: ['semesters'], queryFn: timetableApi.getSemesters });
  const semesterId = semesters.data?.find((s) => s.isActive)?.id ?? semesters.data?.[0]?.id ?? '';

  const entries = useQuery<EntryRich[]>({
    queryKey: ['optim-entries', semesterId],
    queryFn: async () => { const res = await client.get('/timetable/entries', { params: { semesterId } }); return (res.data?.data ?? res.data) as EntryRich[]; },
    enabled: analysed && !!semesterId,
  });

  const suggestions = useQuery<Suggestion[]>({
    queryKey: ['optim-suggest', semesterId],
    queryFn: async () => { const res = await client.get('/optimization/suggest', { params: { semester_id: semesterId } }); return (res.data?.data ?? res.data) as Suggestion[]; },
    enabled: analysed && !!semesterId,
  });

  const entryMap = useMemo(() => {
    const m = new Map<string, EntryRich>();
    (entries.data ?? []).forEach((e) => m.set(e.id, e));
    return m;
  }, [entries.data]);

  const efficiencyScore = useMemo(() => {
    const total = entries.data?.length ?? 0;
    if (total === 0) return 100;
    return Math.max(0, Math.round(100 - ((suggestions.data?.length ?? 0) / total) * 100));
  }, [entries.data, suggestions.data]);

  const applyMut = useMutation({
    mutationFn: () => {
      const changes = (suggestions.data ?? [])
        .filter((s) => selected.has(s.entryId) && s.suggestedRoom)
        .map((s) => ({ entryId: s.entryId, newRoomId: s.suggestedRoom!.id }));
      return client.post('/optimization/apply', { changes });
    },
    onSuccess: () => {
      push('Selected optimizations applied', 'success');
      qc.invalidateQueries({ queryKey: ['optim-suggest'] });
      qc.invalidateQueries({ queryKey: ['optim-entries'] });
      setApplyOpen(false); setSelected(new Set()); setAnalysed(false);
    },
    onError: () => push('Could not apply optimizations', 'error'),
  });

  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Room Optimization</h1>
        <Button leftIcon={<Sparkles size={16} />} loading={suggestions.isLoading || entries.isLoading} onClick={() => { setAnalysed(true); setSelected(new Set()); }} disabled={!semesterId}>
          Analyse Semester
        </Button>
      </div>

      {!analysed ? (
        <EmptyState icon={<Sparkles size={48} />} title="Ready to optimise" description="Click 'Analyse Semester' to detect oversized room assignments and suggest better-fitting rooms." />
      ) : (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Efficiency score</p>
                <p className="text-2xl font-bold text-gray-800">{efficiencyScore}% <span className="text-sm font-normal text-gray-400">of optimal</span></p>
              </div>
              <Badge variant={efficiencyScore >= 80 ? 'success' : efficiencyScore >= 50 ? 'warning' : 'danger'}>
                {suggestions.data?.length ?? 0} suggestion(s)
              </Badge>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {suggestions.isLoading ? <div className="p-4"><Skeleton shape="row" count={4} /></div> : (suggestions.data ?? []).length === 0 ? (
              <EmptyState title="No optimizations needed" description="All room assignments are well-sized for their classes." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>{['', 'Current Room', 'Class', 'Strength', 'Room Cap', 'Util %', 'Suggested Room', 'Improvement', 'Reason'].map((h) => (
                      <th key={h} className="px-3 py-3 text-left font-semibold text-gray-600">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(suggestions.data ?? []).map((s) => {
                      const e = entryMap.get(s.entryId);
                      const strength = e?.class?.strength ?? 0;
                      const cap = s.currentRoom.capacity;
                      const util = cap > 0 ? Math.round((strength / cap) * 100) : 0;
                      const disabled = !s.suggestedRoom;
                      return (
                        <tr key={s.entryId} className={disabled ? 'opacity-60' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-3">
                            <input type="checkbox" checked={selected.has(s.entryId)} disabled={disabled} onChange={() => toggle(s.entryId)} aria-label={`Select ${s.currentRoom.code}`} />
                          </td>
                          <td className="px-3 py-3 font-medium text-gray-800">{s.currentRoom.code}</td>
                          <td className="px-3 py-3 text-gray-600">{e?.class?.name ?? '—'}</td>
                          <td className="px-3 py-3 text-gray-600">{strength}</td>
                          <td className="px-3 py-3 text-gray-600">{cap}</td>
                          <td className="px-3 py-3"><Badge variant={util < 50 ? 'warning' : 'success'}>{util}%</Badge></td>
                          <td className="px-3 py-3 text-primary-700">{s.suggestedRoom?.code ?? '—'}</td>
                          <td className="px-3 py-3 text-gray-600">{s.suggestedRoom ? `+${s.efficiencyGain}%` : '—'}</td>
                          <td className="px-3 py-3 text-gray-500">{s.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {selected.size > 0 && (
            <div className="flex justify-end">
              <Button leftIcon={<Check size={16} />} onClick={() => setApplyOpen(true)}>Apply Selected ({selected.size})</Button>
            </div>
          )}
        </>
      )}

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply Optimizations" size="sm"
        footer={<>
          <Button variant="ghost" size="sm" onClick={() => setApplyOpen(false)}>Cancel</Button>
          <Button size="sm" loading={applyMut.isPending} onClick={() => applyMut.mutate()}>Confirm & Apply</Button>
        </>}>
        <p className="text-sm text-gray-600">
          This will reassign <span className="font-medium">{selected.size}</span> timetable entr
          {selected.size === 1 ? 'y' : 'ies'} to the suggested rooms. Affected classes will be notified of room changes.
        </p>
      </Modal>
    </div>
  );
}
