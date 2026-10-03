import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download } from 'lucide-react';
import type { ExamType, Resource } from '@/types';
import { resourcesApi, timetableApi, departmentsApi } from '@/api/endpoints';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

const EXAM_TYPES: ExamType[] = ['END_SEM', 'INTERNAL', 'ASSIGNMENT', 'LAB_MANUAL', 'NOTES', 'OTHER'];

interface Filters {
  departmentId: string;
  subjectId: string;
  semester: string;
  academicYear: string;
  examType: string;
}

const defaultFilters: Filters = {
  departmentId: '',
  subjectId: '',
  semester: '',
  academicYear: '',
  examType: '',
};

export default function ResourceSearchPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', filters.departmentId],
    queryFn: () => timetableApi.getSubjects({ departmentId: filters.departmentId }),
    enabled: !!filters.departmentId,
  });

  const { data: resources, isFetching, refetch } = useQuery({
    queryKey: ['resources-search', filters],
    queryFn: () =>
      resourcesApi.search({
        departmentId: filters.departmentId || undefined,
        subjectCode: subjects.find((s) => s.id === filters.subjectId)?.code,
        semester: filters.semester ? Number(filters.semester) : undefined,
      }),
    enabled: submitted,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    refetch();
  }

  async function handleDownload(resource: Resource) {
    setDownloading(resource.id);
    try {
      const blob = await resourcesApi.download(resource.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  const departmentOptions = departments.map((d) => ({ label: d.name, value: d.id }));
  const subjectOptions = subjects.map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }));
  const semesterOptions = Array.from({ length: 8 }, (_, i) => ({ label: `Semester ${i + 1}`, value: i + 1 }));
  const examTypeOptions = EXAM_TYPES.map((t) => ({ label: t.replace('_', ' '), value: t }));

  const resourceList: Resource[] = (() => {
    if (!resources) return [];
    if (Array.isArray(resources)) return resources;
    return (resources as { items?: Resource[] }).items ?? [];
  })();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-800">Search Resources</h1>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Department"
            options={departmentOptions}
            value={filters.departmentId}
            placeholder="Any department"
            onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value, subjectId: '' }))}
          />
          <Select
            label="Subject"
            options={subjectOptions}
            value={filters.subjectId}
            placeholder={filters.departmentId ? 'Any subject' : 'Select dept first'}
            disabled={!filters.departmentId}
            onChange={(e) => setFilters((f) => ({ ...f, subjectId: e.target.value }))}
          />
          <Select
            label="Semester"
            options={semesterOptions}
            value={filters.semester}
            placeholder="Any semester"
            onChange={(e) => setFilters((f) => ({ ...f, semester: e.target.value }))}
          />
          <Input
            label="Academic Year"
            value={filters.academicYear}
            placeholder="e.g. 2025-26"
            onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))}
          />
          <Select
            label="Exam Type"
            options={examTypeOptions}
            value={filters.examType}
            placeholder="Any type"
            onChange={(e) => setFilters((f) => ({ ...f, examType: e.target.value }))}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" leftIcon={<Search size={15} />} loading={isFetching}>
            Search
          </Button>
        </div>
      </form>

      {submitted && (
        <div>
          {isFetching ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton shape="card" count={6} />
            </div>
          ) : resourceList.length === 0 ? (
            <EmptyState title="No resources found" description="Try different filters." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resourceList.map((r) => (
                <ResourceCard
                  key={r.id}
                  resource={r}
                  onDownload={() => handleDownload(r)}
                  isDownloading={downloading === r.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource, onDownload, isDownloading }: {
  resource: Resource;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div>
        <p className="font-medium text-gray-800 line-clamp-2">{resource.title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{resource.subjectId ?? 'No subject'}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge variant="primary">{resource.examType.replace('_', ' ')}</Badge>
        <Badge variant="gray">{resource.academicYear}</Badge>
        <Badge variant="gray">Sem {resource.semester}</Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
        <span>{resource.downloadCount} downloads</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<Download size={14} />}
        loading={isDownloading}
        onClick={onDownload}
      >
        Download
      </Button>
    </Card>
  );
}
