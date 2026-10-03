// Typed API functions wrapping client.ts for every backend route
import client, { AxiosRequestConfig } from './client';
import type {
  ApiResponse,
  AuditLog,
  AvailabilityQuery,
  Building,
  Class,
  Complaint,
  ComplaintCreateRequest,
  ComplaintUpdate,
  ComplaintStatus,
  Department,
  EnergyRecord,
  Floor,
  LoginRequest,
  LoginResponse,
  PaginatedResponse,
  Resource,
  ResourceUploadRequest,
  Role,
  Room,
  RoomReservation,
  RoomStatus,
  Semester,
  Subject,
  TimetableEntry,
  User,
} from '@/types';

async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  const res = await promise;
  // Support both raw payload and wrapped ApiResponse shapes
  return (res.data as ApiResponse<T>)?.data ?? (res.data as T);
}

// ─── Auth ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (body: LoginRequest) =>
    unwrap<LoginResponse>(client.post('/auth/login', body)),
  register: (body: Partial<User> & { password: string }) =>
    unwrap<LoginResponse>(client.post('/auth/register', body)),
  me: () => unwrap<User>(client.get('/auth/me')),
  logout: () => unwrap<void>(client.post('/auth/logout')),
  refresh: () => unwrap<{ accessToken: string }>(client.post('/auth/refresh')),
};

// ─── Buildings / Floors ────────────────────────────────────────────────
export const buildingsApi = {
  list: (params?: { isActive?: boolean }) =>
    unwrap<Building[]>(client.get('/buildings', { params })),
  getById: (id: string) => unwrap<Building>(client.get(`/buildings/${id}`)),
  create: (body: Partial<Building>) =>
    unwrap<Building>(client.post('/buildings', body)),
  update: (id: string, body: Partial<Building>) =>
    unwrap<Building>(client.patch(`/buildings/${id}`, body)),
  uploadBlueprint: (floorId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap<Floor>(client.post(`/buildings/floors/${floorId}/blueprint`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
  listFloors: (buildingId: string) =>
    unwrap<Floor[]>(client.get(`/buildings/${buildingId}/floors`)),
  createFloor: (buildingId: string, body: Partial<Floor>) =>
    unwrap<Floor>(client.post(`/buildings/${buildingId}/floors`, body)),
};

// ─── Rooms ──────────────────────────────────────────────────────────────
export const roomsApi = {
  list: (params?: { buildingId?: string; status?: RoomStatus; type?: string }) =>
    unwrap<Room[]>(client.get('/rooms', { params })),
  getById: (id: string) => unwrap<Room>(client.get(`/rooms/${id}`)),
  create: (body: Partial<Room>) => unwrap<Room>(client.post('/rooms', body)),
  update: (id: string, body: Partial<Room>) =>
    unwrap<Room>(client.patch(`/rooms/${id}`, body)),
  patchStatus: (id: string, status: RoomStatus) =>
    unwrap<Room>(client.patch(`/rooms/${id}/status`, { status })),
};

// ─── Departments ────────────────────────────────────────────────────────
export const departmentsApi = {
  list: () => unwrap<Department[]>(client.get('/departments')),
  getById: (id: string) => unwrap<Department>(client.get(`/departments/${id}`)),
};

// ─── Timetable ──────────────────────────────────────────────────────────
export const timetableApi = {
  getEntries: (params: { classId?: string; semesterId?: string; day?: string }) =>
    unwrap<TimetableEntry[]>(client.get('/timetable', { params })),
  createEntry: (body: Partial<TimetableEntry>) =>
    unwrap<TimetableEntry>(client.post('/timetable', body)),
  importCSV: (file: File, semesterId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('semesterId', semesterId);
    return unwrap<{ imported: number; conflicts: number }>(
      client.post('/timetable/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
  getConflicts: (params: { semesterId: string }) =>
    unwrap<unknown[]>(client.get('/timetable/conflicts', { params })),
  getClasses: (params?: { semesterId?: string }) =>
    unwrap<Class[]>(client.get('/timetable/classes', { params })),
  getSemesters: () => unwrap<Semester[]>(client.get('/timetable/semesters')),
  getSubjects: (params?: { departmentId?: string }) =>
    unwrap<Subject[]>(client.get('/timetable/subjects', { params })),
};

// ─── Availability ────────────────────────────────────────────────────────
export const availabilityApi = {
  getRooms: (query: AvailabilityQuery) =>
    unwrap<Room[]>(client.get('/availability/rooms', { params: query })),
  getNow: (params?: { buildingId?: string }) =>
    unwrap<Room[]>(client.get('/availability/now', { params })),
  isClassFree: (classId: string, params: { day?: string; period?: number }) =>
    unwrap<{ free: boolean }>(client.get(`/availability/class/${classId}`, { params })),
};

// ─── Reservations ───────────────────────────────────────────────────────
export const reservationsApi = {
  create: (body: Partial<RoomReservation>) =>
    unwrap<RoomReservation>(client.post('/reservations', body)),
  list: (params?: { date?: string; roomId?: string }) =>
    unwrap<RoomReservation[]>(client.get('/reservations', { params })),
  getMyReservations: () =>
    unwrap<RoomReservation[]>(client.get('/reservations/mine')),
  cancel: (id: string) =>
    unwrap<RoomReservation>(client.patch(`/reservations/${id}/cancel`)),
};

// ─── Resources ──────────────────────────────────────────────────────────
export const resourcesApi = {
  upload: (req: ResourceUploadRequest) => {
    const form = new FormData();
    Object.entries(req).forEach(([k, v]) => {
      if (v !== undefined) form.append(k, v as string | Blob);
    });
    return unwrap<Resource>(client.post('/resources', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
  search: (params: { subjectCode?: string; departmentId?: string; semester?: number }) =>
    unwrap<PaginatedResponse<Resource> | Resource[]>(
      client.get('/resources', { params }),
    ),
  download: (id: string) => unwrap<Blob>(client.get(`/resources/${id}/download`, { responseType: 'blob' })),
  approve: (id: string, approved: boolean) =>
    unwrap<Resource>(client.patch(`/resources/${id}/approve`, { approved })),
  delete: (id: string) => unwrap<void>(client.delete(`/resources/${id}`)),
  getMyUploads: () => unwrap<Resource[]>(client.get('/resources/mine')),
};

// ─── Complaints ─────────────────────────────────────────────────────────
export const complaintsApi = {
  file: (body: ComplaintCreateRequest) =>
    unwrap<Complaint>(client.post('/complaints', body)),
  list: (params?: { status?: ComplaintStatus; assignedToId?: string }) =>
    unwrap<Complaint[]>(client.get('/complaints', { params })),
  getById: (id: string) => unwrap<Complaint>(client.get(`/complaints/${id}`)),
  assign: (id: string, userId: string) =>
    unwrap<Complaint>(client.patch(`/complaints/${id}/assign`, { userId })),
  updateStatus: (id: string, status: ComplaintStatus, message?: string) =>
    unwrap<ComplaintUpdate>(client.patch(`/complaints/${id}/status`, { status, message })),
  getStats: () =>
    unwrap<{ total: number; open: number; resolved: number; byCategory: Record<string, number> }>(
      client.get('/complaints/stats'),
    ),
};

// ─── AI Copilot ─────────────────────────────────────────────────────────
export const aiApi = {
  query: (message: string, context?: Record<string, unknown>) =>
    unwrap<{ reply: string; intent?: string; cards?: unknown[] }>(
      client.post('/ai/query', { message, context }),
    ),
};

// ─── Analytics ──────────────────────────────────────────────────────────
export const analyticsApi = {
  overview: () =>
    unwrap<{
      totalBuildings: number;
      totalRooms: number;
      totalUsers: number;
      totalComplaints: number;
      activeReservations: number;
    }>(client.get('/analytics/overview')),
  utilization: (params?: { buildingId?: string }) =>
    unwrap<Record<string, unknown>>(client.get('/analytics/utilization', { params })),
  complaints: (params?: { from?: string; to?: string }) =>
    unwrap<Record<string, unknown>>(client.get('/analytics/complaints', { params })),
  alerts: () => unwrap<unknown[]>(client.get('/analytics/alerts')),
};

// ─── Optimization ───────────────────────────────────────────────────────
export const optimizationApi = {
  suggest: (params?: { buildingId?: string }) =>
    unwrap<unknown[]>(client.get('/optimization/suggest', { params })),
  apply: (id: string) => unwrap<unknown>(client.post(`/optimization/apply/${id}`)),
};

// ─── Simulation ─────────────────────────────────────────────────────────
export const simulationApi = {
  run: (body: Record<string, unknown>) =>
    unwrap<Record<string, unknown>>(client.post('/simulation/run', body)),
};

// ─── Energy ─────────────────────────────────────────────────────────────
export const energyApi = {
  getData: (params: { buildingId?: string; from?: string; to?: string }) =>
    unwrap<EnergyRecord[]>(client.get('/energy', { params })),
  getAnomalies: (params: { buildingId?: string }) =>
    unwrap<EnergyRecord[]>(client.get('/energy/anomalies', { params })),
  getSummary: (params: { buildingId?: string }) =>
    unwrap<{ totalKwh: number; avgDaily: number; anomalies: number }>(
      client.get('/energy/summary', { params }),
    ),
};

// ─── Reports ────────────────────────────────────────────────────────────
export const reportsApi = {
  get: (params: { type: string; from?: string; to?: string }) =>
    unwrap<Blob>(client.get('/reports', { params, responseType: 'blob' })),
};

// ─── ML Proxy ──────────────────────────────────────────────────────────
export const mlApi = {
  demandForecast: (body: Record<string, unknown>) =>
    unwrap<{ prediction: number; label?: string }>(client.post('/ml/predict/demand', body)),
  energyForecast: (body: Record<string, unknown>) =>
    unwrap<{ prediction: number; label?: string }>(client.post('/ml/predict/energy', body)),
  maintenanceForecast: (body: Record<string, unknown>) =>
    unwrap<{ prediction: number; label?: string }>(client.post('/ml/predict/maintenance', body)),
};

export { client };
export type { AxiosRequestConfig, Role };
