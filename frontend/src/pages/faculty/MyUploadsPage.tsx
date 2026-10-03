import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import type { Resource, ExamType } from '@/types';
import { resourcesApi, timetableApi } from '@/api/endpoints';
import { useToast } from '@/components/ui/useToast';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';

const EXAM_TYPES: ExamType[] = ['END_SEM', 'INTERNAL', 'ASSIGNMENT', 'LAB_MANUAL', 'NOTES', 'OTHER'];
const STATUS_VARIANT = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' } as const;

export default function MyUploadsPage() {
  const { push } = useToast();
  const qc = useQueryClient();
  const [subjectFilter, setSubjectFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('');
  const [deleting, setDeleting] = useState<Resource | null>(null);

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ['my-uploads'],
    queryFn: () => resourcesApi.getMyUploads(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-my'],
    queryFn: () => timetableApi.getSubjects({ departmentId: 'me' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => resourcesApi.delete(id),
    onSuccess: () => {
      push('Resource deleted', 'success');
      qc.invalidateQueries({ queryKey: ['my-uploads'] });
      setDeleting(null);
    },
    onError: () => push('Failed to delete resource', 'error'),
  });

  const subjectOptions = subjects.map((s) => ({ label: s.name, value: s.id }));
  const semesterOptions = Array.from({ length: 8 }, (_, i) => ({ label: `Semester ${i + 1}`, value: i + 1 }));
  const examTypeOptions = EXAM_TYPES.map((t) => ({ label: t.replace('_', ' '), value: t }));

  const filtered = uploads.filter((u) => {
    if (subjectFilter && u.subjectId !== subjectFilter) return false;
    if (semesterFilter && String(u.semester) !== semesterFilter) return false;
    if (examTypeFilter && u.examType !== examTypeFilter) return false;
    return true;
  });

  const statusOf = (u: Resource): keyof typeof STATUS_VARIANT =>
    u.isApproved ? 'APPROVED' : 'PENDING';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">My Uploads</h1>

      <div className="flex flex-wrap gap-3">
        <Select
          options={subjectOptions}
          value={subjectFilter}
          placeholder="All subjects"
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="min-w-[150px]"
        />
        <Select
          options={semesterOptions}
          value={semesterFilter}
          placeholder="All semesters"
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="min-w-[130px]"
        />
        <Select
          options={examTypeOptions}
          value={examTypeFilter}
          placeholder="All types"
          onChange={(e) => setExamTypeFilter(e.target.value)}
          className="min-w-[130px]"
        />
        {(subjectFilter || semesterFilter || examTypeFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSubjectFilter(''); setSemesterFilter(''); setExamTypeFilter(''); }}>
            Clear
          </Button>
        )}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4"><Skeleton shape="row" count={5} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No uploads found" description="Upload a resource to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Title', 'Subject', 'Sem', 'Type', 'Year', 'Status', 'Downloads', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{u.title}</td>
                    <td className="px-4 py-3 text-gray-600">{u.subjectId ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.semester}</td>
                    <td className="px-4 py-3"><Badge variant="gray">{u.examType.replace('_', ' ')}</Badge></td>
                    <td className="px-4 py-3 text-gray-600">{u.academicYear}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[statusOf(u)]}>{statusOf(u)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.downloadCount}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title="Delete"
                        aria-label="Delete resource"
                        onClick={() => setDeleting(u)}
                        className="text-danger-500 hover:text-danger-700 rounded p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Resource"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Delete <span className="font-medium">{deleting?.title}</span>? This cannot be undone.</p>
      </Modal>
    </div>
  );
}
