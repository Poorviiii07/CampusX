import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, ShieldAlert, AlertOctagon, Lightbulb, ChevronDown } from 'lucide-react';
import type { Class, DayOfWeek, Room, Semester, Subject } from '@/types';
import { roomsApi, timetableApi } from '@/api/endpoints';
import client from '@/api/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';

type Scenario = 'ROOM_UNAVAILABLE' | 'CLASS_ADDED' | 'STRENGTH_INCREASE';
const SCENARIOS: { value: Scenario; label: string; hint: string }[] = [
  { value: 'ROOM_UNAVAILABLE', label: 'Room Unavailable', hint: 'What if a room becomes unavailable for a period?' },
  { value: 'CLASS_ADDED', label: 'Add Class', hint: 'What if a new class is added to a slot?' },
  { value: 'STRENGTH_INCREASE', label: 'Increase Strength', hint: 'What if a class strength increases?' },
];
const DAYS: { label: string; value: DayOfWeek }[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => ({ label: d, value: d as DayOfWeek }));
const PERIODS = Array.from({ length: 8 }, (_, i) => ({ label: `Period ${i + 1}`, value: i + 1 }));

interface SimResult {
  scenarioType: string;
  conflicts: string[];
  affected_classes: string[];
  affected_rooms: string[];
  suggestions: { roomId?: string; roomCode?: string; capacity?: number; reason?: string }[];
}

export default function SimulationPage() {
  const [scenario, setScenario] = useState<Scenario>('ROOM_UNAVAILABLE');
  const [open, setOpen] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({ period: '1', day: 'MON', newStrength: '70' });

  const semesters = useQuery<Semester[]>({ queryKey: ['semesters'], queryFn: timetableApi.getSemesters });
  const semesterId = semesters.data?.find((s) => s.isActive)?.id ?? semesters.data?.[0]?.id ?? '';
  const rooms = useQuery<Room[]>({ queryKey: ['all-rooms'], queryFn: () => roomsApi.list() });
  const classes = useQuery<Class[]>({ queryKey: ['classes', semesterId], queryFn: () => timetableApi.getClasses({ semesterId }), enabled: !!semesterId });
  const subjects = useQuery<Subject[]>({ queryKey: ['subjects-all'], queryFn: () => timetableApi.getSubjects() });

  const runMut = useMutation({
    mutationFn: async () => {
      const res = await client.post('/simulation/run', { scenario_type: scenario, params });
      return (res.data?.data ?? res.data) as SimResult;
    },
  });

  function run() {
    const payload: Record<string, string> = { ...params };
    if (scenario === 'ROOM_UNAVAILABLE') payload.date = payload.date ?? new Date().toISOString().split('T')[0];
    setParams(payload);
    runMut.mutate();
  }

  const r = runMut.data;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">What-If Simulation</h1>

      <div className="flex items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-2.5 text-sm text-warning-800">
        <ShieldAlert size={18} /> This simulation is read-only and does not affect live data.
      </div>

      <Card className="p-4">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">Scenario</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SCENARIOS.map((s) => (
              <label key={s.value} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 ${scenario === s.value ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
                <input type="radio" name="scenario" className="mt-0.5" checked={scenario === s.value} onChange={() => { setScenario(s.value); runMut.reset(); }} />
                <span>
                  <span className="block text-sm font-medium text-gray-800">{s.label}</span>
                  <span className="block text-xs text-gray-500">{s.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {scenario === 'ROOM_UNAVAILABLE' && (
            <>
              <Select label="Room" options={(rooms.data ?? []).map((rm) => ({ label: rm.code, value: rm.id }))} value={params.roomId ?? ''} onChange={(e) => setParams({ ...params, roomId: e.target.value })} placeholder="Select room" />
              <Select label="Period" options={PERIODS} value={params.period} onChange={(e) => setParams({ ...params, period: e.target.value })} />
              <Input label="Date" type="date" value={params.date ?? ''} onChange={(e) => setParams({ ...params, date: e.target.value })} />
            </>
          )}
          {scenario === 'CLASS_ADDED' && (
            <>
              <Select label="Class" options={(classes.data ?? []).map((c) => ({ label: c.name, value: c.id }))} value={params.classId ?? ''} onChange={(e) => setParams({ ...params, classId: e.target.value })} placeholder="Select class" />
              <Select label="Subject" options={(subjects.data ?? []).map((s) => ({ label: s.code, value: s.id }))} value={params.subjectId ?? ''} onChange={(e) => setParams({ ...params, subjectId: e.target.value })} placeholder="Select subject" />
              <Input label="Faculty ID" value={params.facultyId ?? ''} onChange={(e) => setParams({ ...params, facultyId: e.target.value })} placeholder="UUID" />
              <Select label="Room" options={(rooms.data ?? []).map((rm) => ({ label: rm.code, value: rm.id }))} value={params.roomId ?? ''} onChange={(e) => setParams({ ...params, roomId: e.target.value })} placeholder="Select room" />
              <Select label="Day" options={DAYS} value={params.day} onChange={(e) => setParams({ ...params, day: e.target.value })} />
              <Select label="Period" options={PERIODS} value={params.period} onChange={(e) => setParams({ ...params, period: e.target.value })} />
            </>
          )}
          {scenario === 'STRENGTH_INCREASE' && (
            <>
              <Select label="Class" options={(classes.data ?? []).map((c) => ({ label: c.name, value: c.id }))} value={params.classId ?? ''} onChange={(e) => setParams({ ...params, classId: e.target.value })} placeholder="Select class" />
              <Input label="New Strength" type="number" min={1} value={params.newStrength} onChange={(e) => setParams({ ...params, newStrength: e.target.value })} />
            </>
          )}
        </div>

        <div className="mt-4">
          <Button leftIcon={<Play size={16} />} loading={runMut.isPending} onClick={run}>Run Simulation</Button>
        </div>
      </Card>

      {runMut.isPending && <Skeleton shape="card" count={3} />}

      {r && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4"><p className="text-sm text-gray-500">Conflicts detected</p><p className="text-2xl font-bold text-danger-600">{r.conflicts.length}</p></Card>
            <Card className="p-4"><p className="text-sm text-gray-500">Affected classes</p><p className="text-2xl font-bold text-warning-600">{r.affected_classes.length}</p></Card>
          </div>

          <ResultCard color="danger" title="Conflicts" icon={<AlertOctagon size={16} />} items={r.conflicts} idKey="conflicts" open={open} setOpen={setOpen} />
          <ResultCard color="warning" title="Affected Classes" icon={<AlertOctagon size={16} />} items={r.affected_classes} idKey="affected" open={open} setOpen={setOpen} />
          <ResultCard color="success" title="Suggestions" icon={<Lightbulb size={16} />} items={r.suggestions.map((s) => `${s.roomCode ?? '—'} (cap ${s.capacity ?? '?'}) — ${s.reason ?? ''}`)} idKey="suggestions" open={open} setOpen={setOpen} />
        </>
      )}
    </div>
  );
}

function ResultCard({ color, title, icon, items, idKey, open, setOpen }: {
  color: 'danger' | 'warning' | 'success';
  title: string; icon: React.ReactNode; items: string[];
  idKey: string; open: string | null; setOpen: (v: string | null) => void;
}) {
  const isOpen = open === idKey;
  const styles: Record<typeof color, { border: string; text: string }> = {
    danger: { border: 'border-danger-200', text: 'text-danger-700' },
    warning: { border: 'border-warning-200', text: 'text-warning-700' },
    success: { border: 'border-success-200', text: 'text-success-700' },
  };
  return (
    <Card className={`border ${styles[color].border}`}>
      <button type="button" onClick={() => setOpen(isOpen ? null : idKey)} className="flex w-full items-center justify-between px-4 py-3">
        <span className={`flex items-center gap-2 text-sm font-semibold ${styles[color].text}`}>{icon} {title} ({items.length})</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-4 py-3">
          {items.length === 0 ? <p className="text-sm text-gray-500">None.</p> : (
            <ul className="space-y-1 text-sm text-gray-700">
              {items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
