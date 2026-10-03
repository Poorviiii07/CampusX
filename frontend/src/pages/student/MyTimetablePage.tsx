import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import type { DayOfWeek, TimetableEntry } from '@/types';
import { timetableApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
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

function buildGrid(entries: TimetableEntry[]): Map<string, TimetableEntry> {
  const map = new Map<string, TimetableEntry>();
  for (const e of entries) {
    map.set(`${e.day}-${e.period}`, e);
  }
  return map;
}

export default function MyTimetablePage() {
  const { user } = useAuth();
  const today = todayDay();

  // Student's classId would come from their profile; use classId from context if available
  const classId = (user as (typeof user & { classId?: string }))?.classId;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['student-timetable', classId],
    queryFn: () => timetableApi.getEntries({ classId }),
    enabled: !!user,
  });

  const grid = buildGrid(entries);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">My Timetable</h1>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Printer size={15} />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </div>

      {isLoading ? (
        <Skeleton shape="card" count={3} />
      ) : entries.length === 0 ? (
        <EmptyState title="No timetable found" description="Your timetable has not been set up yet." />
      ) : (
        <>
          {/* Desktop grid */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm print:shadow-none">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600 w-16">Period</th>
                  {DAYS.map((d) => (
                    <th
                      key={d}
                      className={`px-3 py-2 text-left font-semibold ${d === today ? 'bg-accent-50 text-accent-800' : 'text-gray-600'}`}
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
                        <td key={d} className={`px-3 py-2 ${isToday ? 'bg-accent-50' : ''}`}>
                          {cell ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-gray-800 text-xs truncate max-w-[100px]">{cell.subjectId.slice(0, 10)}</span>
                              <span className="text-gray-500 text-xs">{cell.roomId.slice(0, 8)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Free Period</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile compact view */}
          <div className="md:hidden space-y-2">
            {today && (
              <div className="rounded-xl border border-accent-200 bg-accent-50 p-3">
                <p className="text-xs font-semibold text-accent-700 mb-2">Today — {DAY_LABELS[today]}</p>
                <div className="space-y-1">
                  {PERIODS.map((p) => {
                    const cell = today ? grid.get(`${today}-${p}`) : undefined;
                    return (
                      <div key={p} className="flex items-center gap-2 text-xs">
                        <span className="w-6 font-medium text-gray-500">{p}</span>
                        {cell ? (
                          <span className="text-gray-800">{cell.subjectId.slice(0, 12)} · {cell.roomId.slice(0, 8)}</span>
                        ) : (
                          <span className="text-gray-400">Free Period</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {DAYS.filter((d) => d !== today).map((d) => (
              <div key={d} className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">{DAY_LABELS[d]}</p>
                <div className="space-y-1">
                  {PERIODS.map((p) => {
                    const cell = grid.get(`${d}-${p}`);
                    return cell ? (
                      <div key={p} className="flex items-center gap-2 text-xs">
                        <span className="w-6 font-medium text-gray-500">{p}</span>
                        <span className="text-gray-700">{cell.subjectId.slice(0, 12)} · {cell.roomId.slice(0, 8)}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
