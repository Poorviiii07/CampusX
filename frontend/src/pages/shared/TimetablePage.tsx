import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, AlertTriangle } from 'lucide-react';
import type { DayOfWeek, TimetableEntry } from '@/types';
import { timetableApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat',
};
const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);

function todayDay(): DayOfWeek | null {
  const map: Record<number, DayOfWeek> = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };
  return map[new Date().getDay()] ?? null;
}

interface CellEntry {
  subjectId: string;
  roomId: string;
  classId: string;
  subject?: { code: string; name: string };
  room?: { code: string };
  faculty?: { name: string };
}

function buildGrid(entries: TimetableEntry[]): Map<string, CellEntry> {
  const map = new Map<string, CellEntry>();
  for (const e of entries) {
    const entry = e as TimetableEntry & { subject?: { code: string; name: string }; room?: { code: string }; faculty?: { name: string } };
    map.set(`${e.day}-${e.period}`, {
      subjectId: e.subjectId,
      roomId: e.roomId,
      classId: e.classId,
      subject: entry.subject,
      room: entry.room,
      faculty: entry.faculty,
    });
  }
  return map;
}

export default function TimetablePage() {
  const { user } = useAuth();
  const today = todayDay();
  const [selectedClassId, setSelectedClassId] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const { data: classes = [] } = useQuery({
    queryKey: ['timetable-classes'],
    queryFn: () => timetableApi.getClasses(),
    enabled: isAdmin,
  });

  const queryClassId = isAdmin ? selectedClassId : undefined;

  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['timetable-entries', queryClassId],
    queryFn: () => timetableApi.getEntries({ classId: queryClassId }),
    enabled: !isAdmin || !!selectedClassId,
  });

  const grid = buildGrid(entries);

  const classOptions = classes.map((c) => ({ label: c.name, value: c.id }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-gray-800">Timetable</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select
              options={classOptions}
              value={selectedClassId}
              placeholder="Select class"
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="min-w-[180px]"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Printer size={15} />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>

      {isAdmin && !selectedClassId ? (
        <p className="text-sm text-gray-500">Select a class to view its timetable.</p>
      ) : isLoading ? (
        <Skeleton shape="card" count={4} />
      ) : isError ? (
        <EmptyState
          icon={<AlertTriangle size={40} className="text-danger-400" />}
          title="Failed to load timetable"
          description="There was an error fetching timetable data."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm print:shadow-none">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 w-16">Period</th>
                {DAYS.map((d) => (
                  <th
                    key={d}
                    className={`px-3 py-2 text-left font-semibold ${
                      d === today ? 'bg-accent-50 text-accent-800' : 'text-gray-600'
                    }`}
                  >
                    {DAY_LABELS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PERIODS.map((p) => (
                <tr key={p} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-500">{p}</td>
                  {DAYS.map((d) => {
                    const cell = grid.get(`${d}-${p}`);
                    const isToday = d === today;
                    return (
                      <td
                        key={d}
                        className={`px-3 py-2 ${isToday ? 'bg-accent-50' : ''}`}
                      >
                        {cell ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-semibold text-xs leading-tight ${
                              cell.subject?.code === 'OE' ? 'text-purple-700' :
                              ['IDS','CNS','NDB','DM','BI','ST','ESE','AEP'].includes(cell.subject?.code ?? '') ? 'text-accent-700' :
                              'text-gray-800'
                            }`}>
                              {cell.subject?.code ?? cell.subjectId.slice(0,8)}
                              {cell.subject?.code === 'OE' && (
                                <span className="ml-1 text-[10px] bg-purple-100 text-purple-600 rounded px-1 font-normal">Elective</span>
                              )}
                              {['IDS','CNS','NDB','DM','BI','ST','ESE'].includes(cell.subject?.code ?? '') && (
                                <span className="ml-1 text-[10px] bg-accent-100 text-accent-600 rounded px-1 font-normal">PE</span>
                              )}
                            </span>
                            {cell.subject?.name && cell.subject.name !== cell.subject.code && (
                              <span className="text-[10px] text-gray-400 leading-tight truncate max-w-[100px]" title={cell.subject.name}>
                                {cell.subject.name}
                              </span>
                            )}
                            <span className="text-gray-500 text-[10px]">{cell.faculty?.name?.split(' ').slice(-1)[0] ?? ''}</span>
                            <span className="text-primary-600 text-[10px]">{cell.room?.code ?? ''}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Free</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex-wrap">
            <span className="font-medium text-gray-600">Legend:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-700 inline-block"></span> Core Subject</span>
            <span className="flex items-center gap-1"><span className="bg-purple-100 text-purple-600 rounded px-1.5 py-0.5">Elective</span> Open Elective (OE)</span>
            <span className="flex items-center gap-1"><span className="bg-accent-100 text-accent-600 rounded px-1.5 py-0.5">PE</span> Professional Elective</span>
            <span className="flex items-center gap-1"><span className="bg-accent-50 rounded px-1.5 py-0.5 text-accent-700">Highlighted col</span> Today</span>
          </div>
        </div>
      )}
    </div>
  );
}
