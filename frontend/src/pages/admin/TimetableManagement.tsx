import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, AlertTriangle, Plus, Download, FileText } from 'lucide-react';
import type { Class, DayOfWeek, Department, Semester, TimetableEntry } from '@/types';
import { timetableApi, departmentsApi } from '@/api/endpoints';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import FileInput from '@/components/ui/FileInput';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import TimetableEntryModal from './TimetableEntryModal';
import TimetablePDFUpload from '@/components/timetable/TimetablePDFUpload';

interface ConflictResult {
  type: 'ROOM_DOUBLE_BOOKED' | 'FACULTY_DOUBLE_BOOKED' | 'CLASS_DOUBLE_BOOKED' | 'CAPACITY_MISMATCH';
  message: string;
  entry1?: { id?: string };
  entry2?: { id?: string };
}

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const RESOLUTIONS: Record<ConflictResult['type'], string> = {
  ROOM_DOUBLE_BOOKED: 'Reassign one entry to an available room for that period.',
  FACULTY_DOUBLE_BOOKED: 'Assign a different faculty member to one of the entries.',
  CLASS_DOUBLE_BOOKED: 'Move one session to a free period.',
  CAPACITY_MISMATCH: 'Move to a room with capacity at least the class strength.',
};

export default function TimetableManagement() {
  const qc = useQueryClient();
  const { push } = useToast();
  const [semesterId, setSemesterId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [classId, setClassId] = useState('');
  const [entryModal, setEntryModal] = useState<{ day: DayOfWeek; period: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const semesters = useQuery<Semester[]>({ queryKey: ['semesters'], queryFn: timetableApi.getSemesters });
  const departments = useQuery<Department[]>({ queryKey: ['departments'], queryFn: departmentsApi.list });
  const activeSemesterId = semesterId || semesters.data?.find((s) => s.isActive)?.id || semesters.data?.[0]?.id || '';
  const classes = useQuery<Class[]>({ queryKey: ['classes', activeSemesterId], queryFn: () => timetableApi.getClasses({ semesterId: activeSemesterId }), enabled: !!activeSemesterId });
  const filteredClasses = (classes.data ?? []).filter((c) => !departmentId || c.departmentId === departmentId);
  const activeClassId = classId || filteredClasses[0]?.id || '';

  const entries = useQuery<TimetableEntry[]>({
    queryKey: ['timetable-entries', activeClassId, activeSemesterId],
    queryFn: async () => {
      const res = await client.get('/timetable/entries', { params: { classId: activeClassId, semesterId: activeSemesterId } });
      return (res.data?.data ?? res.data) as TimetableEntry[];
    },
    enabled: !!activeClassId && !!activeSemesterId,
  });
  const conflicts = useQuery<ConflictResult[]>({
    queryKey: ['timetable-conflicts', activeSemesterId],
    queryFn: async () => { const res = await client.get('/timetable/conflicts'); return (res.data?.data ?? res.data) as ConflictResult[]; },
    enabled: !!activeSemesterId,
  });

  const entryMap = useMemo(() => {
    const m = new Map<string, TimetableEntry>();
    (entries.data ?? []).forEach((e) => m.set(`${e.day}-${e.period}`, e));
    return m;
  }, [entries.data]);
  const conflictIds = useMemo(() => {
    const s = new Set<string>();
    (conflicts.data ?? []).forEach((c) => { if (c.entry1?.id) s.add(c.entry1.id); if (c.entry2?.id) s.add(c.entry2.id); });
    return s;
  }, [conflicts.data]);

  const importMut = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('file', importFile!);
      form.append('semesterId', activeSemesterId);
      return client.post('/timetable/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      const d = (res.data?.data ?? res.data) as { created?: number; errors?: unknown[] };
      push(`Imported ${d.created ?? 0} entries`, 'success');
      qc.invalidateQueries({ queryKey: ['timetable-entries'] });
      qc.invalidateQueries({ queryKey: ['timetable-conflicts'] });
      setImportOpen(false); setImportFile(null);
    },
    onError: () => push('Import failed', 'error'),
  });

  function downloadTemplate() {
    const csv = 'classId,subjectId,facultyId,roomId,day,period,startTime,endTime\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'timetable-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-800">Timetable Management</h1>
        <Button size="sm" variant="secondary" leftIcon={<Upload size={15} />} onClick={() => setImportOpen(true)}>Import CSV</Button>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select label="Semester" options={(semesters.data ?? []).map((s) => ({ label: `${s.type} ${s.academicYear}`, value: s.id }))} value={activeSemesterId} onChange={(e) => { setSemesterId(e.target.value); setClassId(''); }} />
          <Select label="Department" placeholder="All departments" options={(departments.data ?? []).map((d) => ({ label: d.name, value: d.id }))} value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setClassId(''); }} />
          <Select label="Class" options={filteredClasses.map((c) => ({ label: c.name, value: c.id }))} value={activeClassId} onChange={(e) => setClassId(e.target.value)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        {/* Week grid */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            {entries.isLoading ? <div className="p-4"><Skeleton shape="row" count={6} /></div> : (
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-2 py-2 text-left font-semibold text-gray-600">Day</th>
                    {Array.from({ length: 8 }, (_, i) => (
                      <th key={i} className="border border-gray-200 px-2 py-2 font-semibold text-gray-600">P{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day}>
                      <td className="border border-gray-200 px-2 py-2 font-medium text-gray-700">{day}</td>
                      {Array.from({ length: 8 }, (_, i) => {
                        const period = i + 1;
                        const entry = entryMap.get(`${day}-${period}`);
                        const isConflict = entry && conflictIds.has(entry.id);
                        return (
                          <td key={period} className={`border border-gray-200 p-0 align-top ${entry ? '' : 'bg-gray-50/50'}`}>
                            {entry ? (
                              <div className={`h-full px-1.5 py-1 ${isConflict ? 'bg-danger-50' : ''}`} title={isConflict ? 'Part of a detected conflict' : undefined}>
                                {(() => {
                                  const subj = (entry as any).subject as { code?: string; name?: string } | undefined;
                                  const fac  = (entry as any).faculty as { name?: string } | undefined;
                                  const room = (entry as any).room   as { code?: string } | undefined;
                                  const code = subj?.code ?? '—';
                                  const isOE = code === 'OE';
                                  const isPE = ['IDS','CNS','NDB','DM','BI','ST','ESE','AEP'].includes(code);
                                  return (
                                    <>
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <p className={`font-semibold text-xs leading-tight ${isOE ? 'text-purple-700' : isPE ? 'text-accent-700' : 'text-gray-800'}`}>
                                          {code}
                                        </p>
                                        {isOE && <span className="text-[9px] bg-purple-100 text-purple-600 rounded px-1">Elective</span>}
                                        {isPE && <span className="text-[9px] bg-accent-100 text-accent-600 rounded px-1">PE</span>}
                                      </div>
                                      {subj?.name && <p className="text-[9px] text-gray-400 truncate leading-tight" title={subj.name}>{subj.name}</p>}
                                      <p className="text-[10px] text-gray-500">{fac?.name?.split(' ').slice(-1)[0] ?? '—'}</p>
                                      <p className="text-[10px] text-primary-700">{room?.code ?? '—'}</p>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <button type="button" aria-label={`Add entry ${day} period ${period}`} onClick={() => setEntryModal({ day, period })} className="flex h-full w-full items-center justify-center px-1.5 py-2 text-gray-300 hover:bg-primary-50 hover:text-primary-600">
                                <Plus size={14} />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {!activeClassId && !entries.isLoading && <div className="p-4"><EmptyState title="Select a class" description="Pick a semester and class to view its timetable." /></div>}
        </Card>

        {/* Conflicts panel */}
        <Card>
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <AlertTriangle size={16} className="text-warning-500" /> Conflicts ({(conflicts.data ?? []).length})
            </h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto px-4 py-3">
            {conflicts.isLoading ? <Skeleton shape="row" count={3} /> : (conflicts.data ?? []).length === 0 ? (
              <EmptyState title="No conflicts detected" />
            ) : (
              <ul className="space-y-3">
                {(conflicts.data ?? []).map((c, i) => (
                  <li key={i} className="rounded-lg border border-danger-100 bg-danger-50/50 p-3">
                    <Badge variant="danger">{c.type.replace('_', ' ')}</Badge>
                    <p className="mt-1.5 text-sm text-gray-700">{c.message}</p>
                    <p className="mt-1 text-xs text-gray-500">→ {RESOLUTIONS[c.type]}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {entryModal && activeClassId && activeSemesterId && (
        <TimetableEntryModal open onClose={() => setEntryModal(null)} classId={activeClassId} semesterId={activeSemesterId} departmentId={(filteredClasses.find((c) => c.id === activeClassId))?.departmentId} day={entryModal.day} period={entryModal.period} />
      )}

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Timetable CSV" size="sm"
        footer={<>
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>Cancel</Button>
          <Button size="sm" loading={importMut.isPending} disabled={!importFile} onClick={() => importFile && importMut.mutate()}>Import</Button>
        </>}>
        <div className="space-y-3">
          <button type="button" onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline">
            <Download size={15} /> Download template
          </button>
          <FileInput accept=".csv" helperText="Columns: classId,subjectId,facultyId,roomId,day,period,startTime,endTime" onChange={setImportFile} />
        </div>
      </Modal>
      {/* PDF Upload Section */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-primary-600" />
          <h2 className="text-base font-semibold text-gray-800">Timetable PDF Repository</h2>
          <span className="text-xs text-gray-500 ml-1">— upload official PDFs for reference</span>
        </div>
        <TimetablePDFUpload />
      </div>
    </div>
  );
}
