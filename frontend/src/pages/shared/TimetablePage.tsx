import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import type { DayOfWeek, TimetableEntry } from '@/types';
import { timetableApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';

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
}

function buildGrid(entries: TimetableEntry[]): Map<string, CellEntry> {
  const map = new Map<string, CellEntry>();
  for (const e of entries) {
    map.set(`${e.day}-${e.period}`, { subjectId: e.subjectId, roomId: e.roomId, classId: e.classId });
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

  const { data: entries = [], isLoading } = useQuery({
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
                            <span className="font-medium text-gray-800 text-xs">{cell.subjectId.slice(0, 8)}</span>
                            <span className="text-gray-500 text-xs">{cell.roomId.slice(0, 8)}</span>
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
        </div>
      )}
    </div>
  );
}
