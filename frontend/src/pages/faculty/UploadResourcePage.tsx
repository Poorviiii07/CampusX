import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import type { ExamType } from '@/types';
import { resourcesApi, timetableApi } from '@/api/endpoints';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/useToast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import FileInput from '@/components/ui/FileInput';
import Badge from '@/components/ui/Badge';

const EXAM_TYPES: ExamType[] = ['END_SEM', 'INTERNAL', 'ASSIGNMENT', 'LAB_MANUAL', 'NOTES', 'OTHER'];

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  subjectId: z.string().min(1, 'Subject required'),
  semester: z.coerce.number().min(1).max(8),
  academicYear: z.string().min(1, 'Academic year required'),
  examType: z.enum(['END_SEM', 'INTERNAL', 'ASSIGNMENT', 'LAB_MANUAL', 'NOTES', 'OTHER']),
  regulation: z.string().optional(),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

export default function UploadResourcePage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploaded, setUploaded] = useState<{ title: string; fileUrl: string; fileName: string } | null>(null);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-my'],
    queryFn: () => timetableApi.getSubjects({ departmentId: 'me' }),
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { semester: 1, examType: 'NOTES', isPublic: true },
  });

  const selectedSubjectId = watch('subjectId');
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!file) throw new Error('No file');
      return resourcesApi.upload({
        title: values.title,
        subjectId: values.subjectId,
        departmentId: user?.id ?? '',
        semester: values.semester,
        academicYear: values.academicYear,
        examType: values.examType,
        regulation: values.regulation,
        description: values.description,
        isPublic: values.isPublic,
        file,
      });
    },
    onMutate: () => { setUploadProgress(10); },
    onSuccess: (res) => {
      setUploadProgress(100);
      push('Resource uploaded successfully', 'success');
      setUploaded({ title: res.title, fileUrl: res.fileUrl, fileName: res.fileName });
    },
    onError: () => {
      setUploadProgress(0);
      push('Upload failed', 'error');
    },
  });

  function onSubmit(values: FormValues) {
    if (!file) { setFileError('Please select a file'); return; }
    if (file.size > 50 * 1024 * 1024) { setFileError('File must be ≤ 50 MB'); return; }
    setFileError('');
    mutation.mutate(values);
  }

  const subjectOptions = subjects.map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }));
  const examTypeOptions = EXAM_TYPES.map((t) => ({ label: t.replace('_', ' '), value: t }));
  const semesterOptions = Array.from({ length: 8 }, (_, i) => ({ label: `Semester ${i + 1}`, value: i + 1 }));

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Upload Resource</h1>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-600">
            Share study materials, notes, or past papers with students.
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Input label="Title" register={register('title')} error={errors.title?.message} placeholder="e.g. Unit 1 Notes" />

            <Select
              label="Subject"
              register={register('subjectId')}
              options={subjectOptions}
              placeholder="Select subject"
              error={errors.subjectId?.message}
              onChange={(e) => {
                setValue('subjectId', e.target.value);
                const subj = subjects.find((s) => s.id === e.target.value);
                if (subj) setValue('semester', subj.semester);
              }}
            />

            {selectedSubject && (
              <p className="text-xs text-gray-500">Subject Code: <span className="font-medium">{selectedSubject.code}</span></p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Select label="Semester" register={register('semester')} options={semesterOptions} error={errors.semester?.message} />
              <Input label="Academic Year" register={register('academicYear')} placeholder="e.g. 2025-26" error={errors.academicYear?.message} />
            </div>

            <Select label="Exam Type" register={register('examType')} options={examTypeOptions} error={errors.examType?.message} />

            <Input label="Department" value={user?.name ?? ''} disabled />

            <Input label="Regulation / Scheme (optional)" register={register('regulation')} placeholder="e.g. R2021" />

            <FileInput
              label="File (PDF, DOC, PPT, ZIP, Images — max 50 MB)"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg,.jpeg"
              error={fileError}
              onChange={setFile}
            />

            <Textarea label="Description (optional)" register={register('description')} rows={2} placeholder="Brief description" />

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300" {...register('isPublic')} defaultChecked />
              <span className="text-sm text-gray-700">Make this resource publicly visible</span>
            </label>

            {mutation.isPending && uploadProgress > 0 && (
              <div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Uploading…</p>
              </div>
            )}

            <Button type="submit" loading={mutation.isPending}>Upload Resource</Button>
          </form>
        </CardBody>
      </Card>

      {uploaded && (
        <Card className="p-4">
          <p className="font-medium text-gray-800 mb-1">Uploaded: {uploaded.title}</p>
          <p className="text-sm text-gray-500 mb-2">{uploaded.fileName}</p>
          <a href={uploaded.fileUrl} download className="inline-flex items-center gap-1.5 text-sm text-primary-700 hover:underline">
            <Download size={14} /> Download
          </a>
          <Badge variant="warning" className="ml-3">Pending Approval</Badge>
        </Card>
      )}
    </div>
  );
}
