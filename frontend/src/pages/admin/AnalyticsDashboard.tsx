import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { AlertTriangle, AlertCircle, Info, DoorOpen, CheckCircle2, MessageSquareWarning, CalendarDays } from 'lucide-react';
import { analyticsApi, roomsApi } from '@/api/endpoints';
import client from '@/api/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import type { EnergyRecord } from '@/types';

const REFRESH = 30 * 1000;
const PIE_COLORS = ['#9DAD6F', '#C3DFE0', '#7D6D61', '#BCD979', '#5E574D', '#A8CBCC', '#6B763F', '#3D3530'];

interface Overview {
  rooms: number; availableRooms: number; activeComplaints: number;
  todayClasses: number; utilizationPercent: number;
}
interface UtilRow { building: string; utilizationPct: number; }
interface ComplaintRow { week: string; open: number; resolved: number; }
interface AlertItem { type: string; message: string; severity: string; entityId?: string }

function isoDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default function AnalyticsDashboard() {
  const overview = useQuery<Overview>({ queryKey: ['analytics-overview'], queryFn: async () => (await analyticsApi.overview()) as unknown as Overview, refetchInterval: REFRESH });
  const utilization = useQuery<UtilRow[]>({ queryKey: ['analytics-utilization'], queryFn: async () => (await analyticsApi.utilization()) as unknown as UtilRow[], refetchInterval: REFRESH });
  const complaints = useQuery<ComplaintRow[]>({ queryKey: ['analytics-complaints'], queryFn: async () => (await analyticsApi.complaints()) as unknown as ComplaintRow[], refetchInterval: REFRESH });
  const alerts = useQuery<AlertItem[]>({ queryKey: ['analytics-alerts'], queryFn: async () => (await analyticsApi.alerts()) as unknown as AlertItem[], refetchInterval: REFRESH });
  const rooms = useQuery({ queryKey: ['all-rooms'], queryFn: () => roomsApi.list() });
  const energy = useQuery<EnergyRecord[]>({
    queryKey: ['energy-30d'],
    queryFn: async () => {
      const res = await client.get('/energy/data', { params: { startDate: isoDaysAgo(30), endDate: isoDaysAgo(0) } });
      return (res.data?.data ?? res.data) as EnergyRecord[];
    },
    refetchInterval: REFRESH,
  });

  const typeDistribution = (rooms.data ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1; return acc;
  }, {});
  const pieData = Object.entries(typeDistribution).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  const energyByDate = (energy.data ?? []).reduce<Record<string, Record<string, number>>>((acc, r) => {
    const date = (r.date ?? '').split('T')[0];
    const b = (r as EnergyRecord & { building?: { name: string } }).building?.name ?? r.buildingId;
    acc[date] ??= {};
    acc[date][b] = (acc[date][b] ?? 0) + r.consumptionKwh;
    return acc;
  }, {});
  const energyBuildings = Array.from(new Set((energy.data ?? []).map((r) => (r as EnergyRecord & { building?: { name: string } }).building?.name ?? r.buildingId)));
  const energyData = Object.entries(energyByDate)
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const ov = overview.data;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Analytics Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<DoorOpen size={18} />} label="Total Rooms" value={ov?.rooms} loading={overview.isLoading} color="#7D6D61" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Available Now" value={ov?.availableRooms} loading={overview.isLoading} color="#9DAD6F" />
        <StatCard icon={<MessageSquareWarning size={18} />} label="Active Complaints" value={ov?.activeComplaints} loading={overview.isLoading} color="#EF4444" />
        <StatCard icon={<CalendarDays size={18} />} label="Today's Classes" value={ov?.todayClasses} loading={overview.isLoading} color="#C3DFE0"
          badge={ov ? `${ov.utilizationPercent}% util` : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Room Utilization by Building" loading={utilization.isLoading}>
          {utilization.data?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={utilization.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="building" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Bar dataKey="utilizationPct" name="Utilization %" fill="#9DAD6F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No utilization data" />}
        </ChartCard>

        <ChartCard title="Complaint Trends (8 weeks)" loading={complaints.isLoading}>
          {complaints.data?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={complaints.data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="open" name="Open" stroke="#EF4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#9DAD6F" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No complaint data" />}
        </ChartCard>

        <ChartCard title="Room Type Distribution" loading={rooms.isLoading}>
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No room data" />}
        </ChartCard>

        <ChartCard title="Energy Consumption (30 days)" loading={energy.isLoading}>
          {energyData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} unit="kWh" />
                <Tooltip />
                <Legend />
                {energyBuildings.map((b, i) => (
                  <Area key={b} type="monotone" dataKey={b} stackId="1" stroke={PIE_COLORS[i % PIE_COLORS.length]} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.4} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No energy data" />}
        </ChartCard>
      </div>

      {/* Alerts */}
      <Card>
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <AlertTriangle size={16} className="text-warning-500" /> Active Alerts
          </h2>
        </div>
        <div className="px-5 py-3">
          {alerts.isLoading ? <Skeleton shape="row" count={3} /> : (alerts.data ?? []).length === 0 ? (
            <EmptyState title="No active alerts" description="All systems operating normally." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {(alerts.data ?? []).map((a, i) => <AlertRow key={i} alert={a} />)}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, loading, color, badge }: {
  icon: React.ReactNode; label: string; value?: number; loading: boolean; color: string; badge?: string;
}) {
  return (
    <Card className="p-4">
      {loading ? <Skeleton shape="text" count={2} /> : (
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-800">{value ?? 0}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: color }}>{icon}</span>
            {badge && <Badge variant="accent">{badge}</Badge>}
          </div>
        </div>
      )}
    </Card>
  );
}

function ChartCard({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <div className="border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-semibold text-gray-700">{title}</h2></div>
      <div className="px-3 py-4">{loading ? <div className="flex h-[260px] items-center justify-center"><Skeleton shape="card" /></div> : children}</div>
    </Card>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const high = alert.severity === 'HIGH';
  const med = alert.severity === 'MEDIUM';
  const Icon = high ? AlertTriangle : med ? AlertCircle : Info;
  const color = high ? 'text-danger-600' : med ? 'text-warning-600' : 'text-primary-600';
  return (
    <li className="flex items-start gap-3 py-3">
      <Icon size={18} className={`mt-0.5 ${color}`} />
      <div className="flex-1">
        <p className="text-sm text-gray-700">{alert.message}</p>
        <p className="text-xs text-gray-400">{alert.type} · {alert.severity}</p>
      </div>
    </li>
  );
}
