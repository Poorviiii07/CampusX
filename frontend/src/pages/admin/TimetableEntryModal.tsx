import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DayOfWeek, Room, Subject } from '@/types';
import { timetableApi } from '@/api/endpoints';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

const DAYS: { label: string; value: DayOfWeek }[] = [
  'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT',
].map((d) => ({ label: d, value: d as DayOfWeek }));
const PERIODS = Array.from({ length: 8 }, (_, i) => ({ label: `Period ${i + 1}`, value: i + 1 }));

export interface TimetableEntryModalProps {
  open: boolean;
  onClose: () => void;
  classId: string;
  semesterId: string;
  departmentId?: string;
  day: DayOfWeek;
  period: number;
}

export default function TimetableEntryModal({
  open, onClose, classId, semesterId, departmentId, day, period,
}: TimetableEntryModalProps) {
  const qc = useQueryClient();
  const { push } = useToast();
  const [form, setForm] = useState({ subjectId: '', facultyId: '', roomId: '', day, period });

  useEffect(() => { if (open) setForm({ subjectId: '', facultyId: '', roomId: '', day, period }); }, [open, day, period]);

  const subjects = useQuery<Subject[]>({
    queryKey: ['subjects', departmentId],
    queryFn: () => timetableApi.getSubjects({ departmentId }),
    enabled: !!departmentId,
  });
  const availableRooms = useQuery<Room[]>({
    queryKey: ['available-rooms', form.day, form.period],
    queryFn: async () => {
      const res = await client.get('/availability/rooms', { params: { period: form.period } });
      return (res.data?.data ?? res.data) as Room[];
    },
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: () => client.post('/timetable/entries', {
      classId, subjectId: form.subjectId, facultyId: form.facultyId,
      roomId: form.roomId, semesterId, day: form.day, period: Number(form.period),
    }),
    onSuccess: () => {
      push('Timetable entry added', 'success');
      qc.invalidateQueries({ queryKey: ['timetable-entries', classId, semesterId] });
      qc.invalidateQueries({ queryKey: ['timetable-conflicts', semesterId] });
      onClose();
    },
    onError: () => push('Could not add entry (check for conflicts)', 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Add Timetable Entry" size="md"
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" loading={createMut.isPending}
          onClick={() => form.subjectId && form.facultyId && form.roomId && createMut.mutate()}>
          Add Entry
        </Button>
      </>}>
      <div className="space-y-3">
        <Select label="Subject" placeholder="Select subject" options={(subjects.data ?? []).map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }))} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} />
        <Input label="Faculty ID (UUID)" value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} placeholder="Faculty user ID" helperText="Enter the faculty member's user UUID" />
        <Select label="Room" placeholder="Select room" options={(availableRooms.data ?? []).map((r) => ({ label: `${r.code} (cap ${r.capacity})`, value: r.id }))} value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} helperText="Available rooms for the selected period" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Day" options={DAYS} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value as DayOfWeek })} />
          <Select label="Period" options={PERIODS} value={String(form.period)} onChange={(e) => setForm({ ...form, period: Number(e.target.value) })} />
        </div>
      </div>
    </Modal>
  );
}
