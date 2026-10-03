import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Play, TrendingUp, Zap, Wrench } from 'lucide-react';
import type { Building, Room } from '@/types';
import { buildingsApi, roomsApi } from '@/api/endpoints';
import client from '@/api/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Table, { type Column } from '@/components/ui/Table';

const DISCLAIMER = 'Predictions based on synthetic demonstration data.';

interface DemandResp { predictions: { date: string; period: number; room_type: string; predicted_demand: number }[]; disclaimer: string }
interface EnergyResp { predictions: { timestamp: string; hour: number; predicted_kwh: number }[]; disclaimer: string }
interface MaintResp { room_id: string; maintenance_probability: number; needs_maintenance: boolean; disclaimer: string }

export default function MLForecasts() {
  const [buildingId, setBuildingId] = useState('');
  const buildings = useQuery<Building[]>({ queryKey: ['buildings'], queryFn: () => buildingsApi.list() });
  const rooms = useQuery<Room[]>({ queryKey: ['all-rooms'], queryFn: () => roomsApi.list() });
  const effectiveBuilding = buildingId || buildings.data?.[0]?.id || '';

  const demand = useMutation({
    mutationFn: async () => { const res = await client.get('/ml/demand-forecast', { params: { building_id: effectiveBuilding, days_ahead: 7 } }); return (res.data?.data ?? res.data) as DemandResp; },
  });
  const energy = useMutation({
    mutationFn: async () => { const res = await client.get('/ml/energy-forecast', { params: { building_id: effectiveBuilding, hours_ahead: 24 } }); return (res.data?.data ?? res.data) as EnergyResp; },
  });
  const maintenance = useMutation({
    mutationFn: async () => {
      const list = (rooms.data ?? []).slice(0, 25);
      const results = await Promise.all(list.map((r) =>
        client.get('/ml/maintenance-forecast', { params: { room_id: r.id, room_type: r.type } })
          .then((res) => (res.data?.data ?? res.data) as MaintResp)
          .catch(() => null),
      ));
      return results.filter((x): x is MaintResp => !!x && (x.needs_maintenance || x.maintenance_probability >= 0.5));
    },
  });

  const demandData = (demand.data?.predictions ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.date] = (acc[p.date] ?? 0) + p.predicted_demand; return acc;
  }, {});
  const demandChart = Object.entries(demandData).map(([date, v]) => ({ date, demand: Math.round(v) }));
  const energyChart = (energy.data?.predictions ?? []).map((p) => ({ hour: `${p.hour}:00`, kwh: p.predicted_kwh }));

  const maintCols: Column<MaintResp & { code?: string }>[] = [
    { key: 'code', header: 'Room', render: (r) => <span className="font-medium text-gray-800">{(rooms.data ?? []).find((rm) => rm.id === r.room_id)?.code ?? r.room_id}</span> },
    { key: 'prob', header: 'Probability', render: (r) => <Badge variant={r.maintenance_probability >= 0.7 ? 'danger' : 'warning'}>{Math.round(r.maintenance_probability * 100)}%</Badge> },
    { key: 'flag', header: 'Status', render: (r) => r.needs_maintenance ? <Badge variant="danger">Needs maintenance</Badge> : <Badge variant="warning">At risk</Badge> },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">ML Forecasts</h1>

      <Card className="p-3">
        <Select label="Building (for demand & energy forecasts)" options={(buildings.data ?? []).map((b) => ({ label: b.name, value: b.id }))} value={effectiveBuilding} onChange={(e) => setBuildingId(e.target.value)} />
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Demand */}
        <Card>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><TrendingUp size={16} /> Demand Forecast (7 days)</h2>
            <Button size="sm" variant="secondary" leftIcon={<Play size={14} />} loading={demand.isPending} onClick={() => demand.mutate()}>Run</Button>
          </div>
          <div className="px-3 py-4">
            {demand.isPending ? <Skeleton shape="card" /> : demand.data ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={demandChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="demand" fill="#1D4ED8" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Run the forecast" />}
            <p className="px-2 pt-1 text-xs italic text-gray-400">{demand.data?.disclaimer ?? DISCLAIMER}</p>
          </div>
        </Card>

        {/* Energy */}
        <Card>
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Zap size={16} /> Energy Forecast (24h)</h2>
            <Button size="sm" variant="secondary" leftIcon={<Play size={14} />} loading={energy.isPending} onClick={() => energy.mutate()}>Run</Button>
          </div>
          <div className="px-3 py-4">
            {energy.isPending ? <Skeleton shape="card" /> : energy.data ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={energyChart}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="hour" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 11 }} unit="kWh" /><Tooltip /><Area type="monotone" dataKey="kwh" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.4} /></AreaChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Run the forecast" />}
            <p className="px-2 pt-1 text-xs italic text-gray-400">{energy.data?.disclaimer ?? DISCLAIMER}</p>
          </div>
        </Card>
      </div>

      {/* Maintenance */}
      <Card>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Wrench size={16} /> Maintenance Alerts</h2>
          <Button size="sm" variant="secondary" leftIcon={<Play size={14} />} loading={maintenance.isPending} onClick={() => maintenance.mutate()}>Run Forecast</Button>
        </div>
        <div className="px-4 py-3">
          {maintenance.isPending ? <Skeleton shape="row" count={4} /> : maintenance.data ? (
            maintenance.data.length === 0 ? <EmptyState title="No rooms at risk" description="No high-probability maintenance alerts." /> :
              <Table columns={maintCols} data={maintenance.data} rowKey={(r) => r.room_id} />
          ) : <EmptyState title="Run the forecast" description="Predicts maintenance probability per room from synthetic data." />}
          <p className="pt-2 text-xs italic text-gray-400">{maintenance.data?.[0]?.disclaimer ?? DISCLAIMER}</p>
        </div>
      </Card>
    </div>
  );
}
