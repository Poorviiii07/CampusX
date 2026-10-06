import { useState, useRef } from 'react';
import { Upload, FileText, X, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '@/api/client';
import Button from '@/components/ui/Button';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

interface PDFRecord {
  id: string;
  originalName: string;
  fileUrl: string;
  semester?: string;
  section?: string;
  department?: string;
  academicYear?: string;
  notes?: string;
  createdAt: string;
}

interface UploadForm {
  semester: string;
  section: string;
  department: string;
  academicYear: string;
  notes: string;
}

const SEMESTERS = ['I','II','III','IV','V','VI','VII','VIII'];
const SECTIONS  = ['A','B','C','D','E','F','G','H'];
const DEPTS     = ['CSE','ECE','Mechanical','Civil','MBA','MCA'];

export default function TimetablePDFUpload() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState<UploadForm>({
    semester: 'VII', section: 'A', department: 'CSE', academicYear: '2026-27', notes: '',
  });
  const [uploadStatus, setUploadStatus] = useState<'idle'|'success'|'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch existing PDFs
  const { data: pdfs, isLoading } = useQuery<PDFRecord[]>({
    queryKey: ['timetable-pdfs'],
    queryFn: async () => {
      const res = await client.get('/timetable/pdfs');
      return res.data?.data ?? [];
    },
  });

  // Upload mutation
  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('semester', form.semester);
      fd.append('section',  form.section);
      fd.append('department', form.department);
      fd.append('academicYear', form.academicYear);
      fd.append('notes', form.notes);
      const res = await client.post('/timetable/upload-pdf', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      setUploadStatus('success');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries({ queryKey: ['timetable-pdfs'] });
      setTimeout(() => setUploadStatus('idle'), 3000);
    },
    onError: (e: any) => {
      setUploadStatus('error');
      setErrorMsg(e?.response?.data?.message ?? 'Upload failed');
    },
  });

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.type.startsWith('image/'))) setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  function fmtSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1024/1024).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Upload size={18} className="text-primary-600" />
            Upload Timetable PDF
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload official timetable PDFs for reference. Fill in the details, then drag & drop or select the file.
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={form.semester}
                onChange={e => setForm(p => ({...p, semester: e.target.value}))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SEMESTERS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Section</label>
              <select
                value={form.section}
                onChange={e => setForm(p => ({...p, section: e.target.value}))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SECTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <select
                value={form.department}
                onChange={e => setForm(p => ({...p, department: e.target.value}))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {DEPTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Academic Year</label>
              <input
                value={form.academicYear}
                onChange={e => setForm(p => ({...p, academicYear: e.target.value}))}
                placeholder="2026-27"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              value={form.notes}
              onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              placeholder="e.g. Revised timetable after 15 Aug"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/png,image/jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={28} className="text-primary-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{fmtSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="ml-2 text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  <span className="text-primary-600 font-medium">Click to browse</span> or drag & drop
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, PNG or JPG — max 20 MB</p>
              </div>
            )}
          </div>

          {/* Status messages */}
          {uploadStatus === 'success' && (
            <div className="mt-3 flex items-center gap-2 text-success-700 bg-success-50 rounded-lg px-3 py-2 text-sm">
              <CheckCircle2 size={16} /> Timetable PDF uploaded successfully!
            </div>
          )}
          {uploadStatus === 'error' && (
            <div className="mt-3 flex items-center gap-2 text-danger-700 bg-danger-50 rounded-lg px-3 py-2 text-sm">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => uploadMut.mutate()}
              loading={uploadMut.isPending}
              disabled={!file || uploadMut.isPending}
              leftIcon={<Upload size={16} />}
            >
              Upload PDF
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Uploaded PDFs list */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={18} className="text-primary-600" />
            Uploaded Timetable PDFs
          </h3>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !pdfs || pdfs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No timetable PDFs uploaded yet.</div>
          ) : (
            <div className="space-y-3">
              {pdfs.map(pdf => (
                <div
                  key={pdf.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{pdf.originalName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {pdf.department && <Badge variant="primary">{pdf.department}</Badge>}
                        {pdf.semester && <Badge variant="accent">Sem {pdf.semester}</Badge>}
                        {pdf.section && <Badge variant="accent">Sec {pdf.section}</Badge>}
                        {pdf.academicYear && <Badge variant="success">{pdf.academicYear}</Badge>}
                        {pdf.notes && <span className="text-xs text-gray-500 italic">{pdf.notes}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(pdf.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`http://localhost:3001${pdf.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium"
                  >
                    <ExternalLink size={14} /> View
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
