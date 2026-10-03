import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Zap, AlertTriangle } from 'lucide-react';
import type { Building, EnergyRecord, Floor } from '@/types';
import { buildingsApi } from '@/api/endpoints';
import client from '@/api/client';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Table, { type Column } from '@/components/ui/Table';

const COLORS = ['#1D4ED8', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6'];
function isoDaysAgo(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }

interface EnergyRow extends EnergyRecord { building?: { name: string } }

export default function EnergyDashboard() {
  const [buildingId, setBuildingId] = useState('');
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));

  const buildings = useQuery<Building[]>({ queryKey: ['buildings'], queryFn: () => buildingsApi.list() });

  const energy = useQuery<EnergyRow[]>({
    queryKey: ['energy', buildingId, from, to],
    queryFn: async () => {
      const res = await client.get('/energy/data', { params: { buildingId: buildingId || undefined, startDate: from, endDate: to } });
      return (res.data?.data ?? res.data) as EnergyRow[];
    },
  });
  const anomalies = useQuery<EnergyRow[]>({
    queryKey: ['energy-anomalies', buildingId],
    queryFn: async () => { const res = await client.get('/energy/anomalies', { params: { buildingId: buildingId || undefined } }); return (res.data?.data ?? res.data) as EnergyRow[]; },
  });
  const floors = useQuery<Floor[]>({ queryKey: ['floors', buildingId], queryFn: () => buildingsApi.listFloors(buildingId), enabled: !!buildingId });

  // Expected (mean) per building+hour for anomaly context
  const expectedMap = useMemo(() => {
    const m: Record<string, number[]> = {};
    (energy.data ?? []).forEach((r) => { const k = `${r.building?.name ?? r.buildingId}:${r.hour}`; (m[k] ??= []).push(r.consumptionKwh); });
    const out: Record<string, number> = {};
    Object.entries(m).forEach(([k, vals]) => { if (vals.length) out[k] = vals.reduce((s, v) => s + v, 0) / vals.length; });
    return out;
  }, [energy.data]);

  const buildingsInData = Array.from(new Set((energy.data ?? []).map((r) => r.building?.name ?? r.buildingId)));
  const byDate = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    (energy.data ?? []).forEach((r) => {
      const date = (r.date ?? '').split('T')[0]; const b = r.building?.name ?? r.buildingId;
      (m[date] ??= {})[b] = (m[date][b] ?? 0) + r.consumptionKwh;
    });
    return Object.entries(m).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
  }, [energy.data]);

  const totals = useMemo(() => {
    const m: Record<string, number> = {};
    (energy.data ?? []).forEach((r) => { const b = r.building?.name ?? r.buildingId; m[b] = (m[b] ?? 0) + r.consumptionKwh; });
    return Object.entries(m).map(([building, kwh]) => ({ building, kwh: Math.round(kwh * 100) / 100 }));
  }, [energy.data]);

  const floorBreakdown = useMemo(() => {
    if (!buildingId) return [];
    const floorName = (fid?: string | null) => floors.data?.find((f) => f.id === fid);
    const m: Record<string, number> = {};
    (energy.data ?? []).forEach((r) => { if (r.floorId) m[r.floorId] = (m[r.floorId] ?? 0) + r.consumptionKwh; });
    return Object.entries(m).map(([fid, kwh]) => {
      const f = floorName(fid);
      return { id: fid, floor: f ? `Floor ${f.floorNumber}` : 'Unassigned', kwh: Math.round(kwh * 100) / 100 };
    });
  }, [energy.data, buildingId, floors.data]);

  const floorCols: Column<typeof floorBreakdown[number]>[] = [
    { key: 'floor', header: 'Floor', render: (r) => <span className="font-medium text-gray-800">{r.floor}</span> },
    { key: 'kwh', header: 'kWh', render: (r) => r.kwh.toFixed(1) },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Energy Dashboard</h1>

      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <Select label="Building" placeholder="All buildings" options={(buildings.data ?? []).map((b) => ({ label: b.name, value: b.id }))} value={buildingId} onChange={(e) => setBuildingId(e.target.value)} />
          <div><label className="text-sm font-medium text-gray-700">From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium text-gray-700">To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></div>
        </div>
      </Card>

      <Card>
        <div className="border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-semibold text-gray-700">Consumption Over Time</h2></div>
        <div className="px-3 py-4">
          {energy.isLoading ? <Skeleton shape="card" /> : byDate.length === 0 ? <EmptyState title="No energy data" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={byDate}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} unit="kWh" />
                <Tooltip />
                {buildingsInData.length > 1 && <Legend />}
                {buildingsInData.map((b, i) => <Area key={b} type="monotone" dataKey={b} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.4} />)}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-semibold text-gray-700">Building Comparison (total kWh)</h2></div>
          <div className="px-3 py-4">
            {energy.isLoading ? <Skeleton shape="card" /> : totals.length === 0 ? <EmptyState title="No data" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={totals} onClick={(e) => { if (e?.activeLabel) { const b = buildings.data?.find((x) => x.name === e.activeLabel); if (b) setBuildingId(b.id); } }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="building" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="kWh" />
                  <Tooltip />
                  <Bar dataKey="kwh" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="px-2 text-xs text-gray-400">Click a bar to drill down by floor.</p>
          </div>
        </Card>

        <Card>
          <div className="border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-semibold text-gray-700">Floor Breakdown {buildingId ? '' : '(select a building)'}</h2></div>
          <div className="px-4 py-3">
            {buildingId ? (floorBreakdown.length === 0 ? <EmptyState title="No floor-level data" /> : <Table columns={floorCols} data={floorBreakdown} rowKey={(r) => r.id} />) : <EmptyState icon={<Zap size={36} />} title="No building selected" description="Select a building to view its floor-level energy breakdown." />}
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-gray-100 px-5 py-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><AlertTriangle size={16} className="text-warning-500" /> Anomalies ({(anomalies.data ?? []).length})</h2></div>
        <div className="px-4 py-3">
          {anomalies.isLoading ? <Skeleton shape="row" count={3} /> : (anomalies.data ?? []).length === 0 ? <EmptyState title="No anomalies detected" /> : (
            <ul className="divide-y divide-gray-100">
              {(anomalies.data ?? []).slice(0, 20).map((a) => {
                const expected = expectedMap[`${a.building?.name ?? a.buildingId}:${a.hour}`];
                return (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-700">{a.building?.name ?? a.buildingId} · {new Date(a.date).toLocaleDateString()} · {a.hour}:00</span>
                    <span className="text-danger-600 font-medium">{a.consumptionKwh.toFixed(1)} kWh{expected ? ` vs ${expected.toFixed(1)} exp` : ''}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
