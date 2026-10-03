import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Eye } from 'lucide-react';
import client from '@/api/client';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Table, { type Column } from '@/components/ui/Table';

const REPORT_TYPES: { label: string; value: string; hint: string }[] = [
  { label: 'Room Utilization', value: 'room-utilization', hint: 'Periods used per room' },
  { label: 'Complaints', value: 'complaints', hint: 'All complaints with status' },
  { label: 'Timetable', value: 'timetable', hint: 'Active semester entries' },
  { label: 'Energy', value: 'energy', hint: 'Energy records (recent 1000)' },
  { label: 'Resources', value: 'resources', hint: 'Uploaded resources' },
];

type Row = Record<string, unknown>;

export default function ReportsPage() {
  const { push } = useToast();
  const [type, setType] = useState(REPORT_TYPES[0].value);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const generate = useMutation({
    mutationFn: async () => {
      const res = await client.get(`/reports/${type}`);
      return (res.data?.data ?? res.data) as Row[];
    },
    onSuccess: () => push('Report generated', 'success'),
    onError: () => push('Could not generate report', 'error'),
  });

  const download = useMutation({
    mutationFn: async () => {
      const res = await client.get(`/reports/${type}`, { params: { format: 'csv' }, responseType: 'blob' });
      return res.data as Blob;
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      push('CSV downloaded', 'success');
    },
    onError: () => push('Download failed', 'error'),
  });

  const data = generate.data ?? [];
  const keys = data.length > 0 ? Object.keys(data[0]) : [];
  const columns: Column<Row>[] = keys.map((k) => ({
    key: k,
    header: k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    render: (r) => {
      const v = r[k];
      if (v == null) return '—';
      if (typeof v === 'object') return JSON.stringify(v).slice(0, 40);
      return String(v);
    },
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Reports</h1>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Select label="Report type" options={REPORT_TYPES.map((t) => ({ label: t.label, value: t.value }))} value={type} onChange={(e) => setType(e.target.value)} />
            <p className="mt-1 text-xs text-gray-500">{REPORT_TYPES.find((t) => t.value === type)?.hint}</p>
          </div>
          <div><label className="text-sm font-medium text-gray-700">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium text-gray-700">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button leftIcon={<Eye size={16} />} loading={generate.isPending} onClick={() => generate.mutate()}>Generate Report</Button>
          <Button variant="secondary" leftIcon={<Download size={16} />} loading={download.isPending} onClick={() => download.mutate()} disabled={!generate.data}>Download CSV</Button>
        </div>
      </Card>

      <Card>
        <div className="border-b border-gray-100 px-5 py-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><FileSpreadsheet size={16} /> Preview</h2></div>
        <div className="px-4 py-3">
          {generate.isPending ? <Skeleton shape="row" count={5} /> : !generate.data ? (
            <EmptyState title="No report yet" description="Choose a report type and click Generate Report." />
          ) : data.length === 0 ? (
            <EmptyState title="No records" />
          ) : (
            <Table columns={columns} data={data} rowKey={(r) => String(r.id ?? Object.values(r).join('|'))} />
          )}
        </div>
      </Card>
    </div>
  );
}
