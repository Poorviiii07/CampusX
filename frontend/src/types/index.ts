// CAMPUS-X shared TypeScript types matching backend Prisma output

// ─── Enums (string literal unions mirror Prisma enums) ────────────────
export type Role = 'ADMIN' | 'FACULTY' | 'STUDENT' | 'GUEST';

export type RoomType =
  | 'CLASSROOM'
  | 'LAB'
  | 'FACULTY_CABIN'
  | 'OFFICE'
  | 'RESTROOM'
  | 'STAFF_ROOM'
  | 'SEMINAR_HALL'
  | 'AUDITORIUM'
  | 'LIBRARY'
  | 'OTHER';

export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'RESERVED'
  | 'TEMP_UNAVAILABLE';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

export type SemesterType = 'ODD' | 'EVEN';

export type ExamType =
  | 'END_SEM'
  | 'INTERNAL'
  | 'ASSIGNMENT'
  | 'LAB_MANUAL'
  | 'NOTES'
  | 'OTHER';

export type ResourceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ComplaintCategory =
  | 'EQUIPMENT'
  | 'PROJECTOR'
  | 'COMPUTER'
  | 'AC'
  | 'FAN_LIGHT'
  | 'WATER'
  | 'RESTROOM'
  | 'NETWORK'
  | 'CLASSROOM_DAMAGE'
  | 'ELECTRICAL'
  | 'OTHER';

export type ComplaintStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReservationType = 'SINGLE' | 'MULTI_PERIOD' | 'FULL_DAY' | 'RECURRING';

export type ReservationStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

// ─── Model interfaces ─────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  avatar?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  totalFloors: number;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Floor {
  id: string;
  floorNumber: number;
  name: string;
  blueprintUrl?: string | null;
  buildingId: string;
  createdAt: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  capacity: number;
  floor: number;
  floorId: string;
  buildingId: string;
  department?: string | null;
  equipment: string; // JSON array stored as string
  accessibility?: string | null;
  description?: string | null;
  coordinatesX?: number | null;
  coordinatesY?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  hodId?: string | null;
  createdAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  departmentId: string;
  semester: number;
  createdAt: string;
}

export interface Semester {
  id: string;
  type: SemesterType;
  academicYear: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  departmentId: string;
  semesterId: string;
  semesterNumber: number;
  section: string;
  strength: number;
  createdAt: string;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string;
  facultyId: string;
  roomId: string;
  semesterId: string;
  day: DayOfWeek;
  period: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface RoomReservation {
  id: string;
  roomId: string;
  reservedById: string;
  classId?: string | null;
  reason: string;
  date: string;
  periodStart: number;
  periodEnd: number;
  type: ReservationType;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string | null;
  subjectId?: string | null;
  departmentId: string;
  semester: number;
  academicYear: string;
  examType: ExamType;
  regulation?: string | null;
  uploadedById: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  isApproved: boolean;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Complaint {
  id: string;
  autoId: string;
  reporterId: string;
  category: ComplaintCategory;
  buildingId?: string | null;
  floorId?: string | null;
  roomId?: string | null;
  description: string;
  imageUrl?: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedToId?: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintUpdate {
  id: string;
  complaintId: string;
  updatedById: string;
  message: string;
  statusChange?: ComplaintStatus | null;
  createdAt: string;
}

export interface EnergyRecord {
  id: string;
  buildingId: string;
  floorId?: string | null;
  roomId?: string | null;
  date: string;
  hour: number;
  consumptionKwh: number;
  meterId?: string | null;
  isAnomaly: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown;
  ipAddress?: string | null;
  createdAt: string;
}

// ─── API helper types ─────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Request/Response DTOs ────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface AvailabilityQuery {
  day?: DayOfWeek;
  period?: number;
  date?: string;
  buildingId?: string;
  roomType?: RoomType;
  minCapacity?: number;
}

export interface ComplaintCreateRequest {
  category: ComplaintCategory;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  description: string;
  imageUrl?: string;
  priority?: ComplaintPriority;
}

export interface ResourceUploadRequest {
  title: string;
  description?: string;
  subjectId?: string;
  departmentId: string;
  semester: number;
  academicYear: string;
  examType: ExamType;
  regulation?: string;
  isPublic?: boolean;
  file: File;
}
