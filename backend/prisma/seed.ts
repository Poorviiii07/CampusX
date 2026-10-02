import { PrismaClient, Role, RoomType, DayOfWeek, SemesterType, ExamType, ComplaintCategory, ComplaintStatus, ComplaintPriority, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

type RoomRecord = Prisma.RoomGetPayload<Record<string, never>>;
type UserRecord = Prisma.UserGetPayload<Record<string, never>>;

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Starting CAMPUS-X seed...');

  // ─────────────────────────────────────────────
  // CLEAN existing data (idempotent)
  // ─────────────────────────────────────────────
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany({});
  await prisma.energyRecord.deleteMany({});
  await prisma.complaintUpdate.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.roomReservation.deleteMany({});
  await prisma.timetableEntry.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.semester.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.floor.deleteMany({});
  await prisma.building.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Cleaned');

  // ─────────────────────────────────────────────
  // USERS (55 total: 5 admin, 15 faculty, 30 students, 5 guests)
  // ─────────────────────────────────────────────
  console.log('👥 Creating users...');

  const adminPassword = await hashPassword('Admin@123');
  const facultyPassword = await hashPassword('Faculty@123');
  const studentPassword = await hashPassword('Student@123');
  const guestPassword = await hashPassword('Guest@123');

  // Admins (5)
  const admin1 = await prisma.user.create({
    data: { email: 'admin@campusx.edu', password: adminPassword, name: 'Dr. Rajesh Kumar', role: Role.ADMIN, phone: '9876543200' }
  });
  const admin2 = await prisma.user.create({
    data: { email: 'admin1@campusx.edu', password: adminPassword, name: 'Dr. Priya Sharma', role: Role.ADMIN, phone: '9876543201' }
  });
  await prisma.user.create({
    data: { email: 'admin2@campusx.edu', password: adminPassword, name: 'Mr. Arun Patel', role: Role.ADMIN, phone: '9876543202' }
  });
  await prisma.user.create({
    data: { email: 'admin3@campusx.edu', password: adminPassword, name: 'Ms. Deepa Nair', role: Role.ADMIN, phone: '9876543203' }
  });
  await prisma.user.create({
    data: { email: 'admin4@campusx.edu', password: adminPassword, name: 'Mr. Suresh Menon', role: Role.ADMIN, phone: '9876543204' }
  });

  // Faculty (15)
  const faculty: UserRecord[] = [];
  const facultyData = [
    { email: 'faculty@campusx.edu', name: 'Dr. Anitha Rajan', phone: '9876543100' },
    { email: 'faculty1@campusx.edu', name: 'Dr. Venkat Subramanian', phone: '9876543101' },
    { email: 'faculty2@campusx.edu', name: 'Prof. Meena Krishnan', phone: '9876543102' },
    { email: 'faculty3@campusx.edu', name: 'Dr. Karthik Babu', phone: '9876543103' },
    { email: 'faculty4@campusx.edu', name: 'Dr. Lavanya Prasad', phone: '9876543104' },
    { email: 'faculty5@campusx.edu', name: 'Prof. Senthil Kumar', phone: '9876543105' },
    { email: 'faculty6@campusx.edu', name: 'Dr. Ramesh Chandran', phone: '9876543106' },
    { email: 'faculty7@campusx.edu', name: 'Dr. Divya Mohan', phone: '9876543107' },
    { email: 'faculty8@campusx.edu', name: 'Prof. Aravind Swamy', phone: '9876543108' },
    { email: 'faculty9@campusx.edu', name: 'Dr. Sindhu Ravi', phone: '9876543109' },
    { email: 'faculty10@campusx.edu', name: 'Dr. Balachander Iyer', phone: '9876543110' },
    { email: 'faculty11@campusx.edu', name: 'Prof. Kavitha Srinivas', phone: '9876543111' },
    { email: 'faculty12@campusx.edu', name: 'Dr. Murugan Pillai', phone: '9876543112' },
    { email: 'faculty13@campusx.edu', name: 'Dr. Nirmala Devi', phone: '9876543113' },
    { email: 'faculty14@campusx.edu', name: 'Prof. Ganesh Reddy', phone: '9876543114' },
  ];
  for (const fd of facultyData) {
    const f = await prisma.user.create({
      data: { ...fd, password: facultyPassword, role: Role.FACULTY }
    });
    faculty.push(f);
  }

  // Students (30)
  const students: UserRecord[] = [];
  for (let i = 1; i <= 30; i++) {
    const s = await prisma.user.create({
      data: {
        email: `student${i}@campusx.edu`,
        password: studentPassword,
        name: `Student ${i} Name`,
        role: Role.STUDENT,
        phone: `98765${String(i).padStart(5, '0')}`
      }
    });
    students.push(s);
  }

  // Guests (5)
  await prisma.user.create({
    data: { email: 'guest@campusx.edu', password: guestPassword, name: 'Campus Visitor', role: Role.GUEST }
  });
  for (let i = 1; i <= 4; i++) {
    await prisma.user.create({
      data: {
        email: `guest${i}@campusx.edu`,
        password: guestPassword,
        name: `Guest User ${i}`,
        role: Role.GUEST
      }
    });
  }

  const totalUsers = await prisma.user.count();
  console.log(`✅ Created ${totalUsers} users`);

  // ─────────────────────────────────────────────
  // BUILDINGS (5)
  // ─────────────────────────────────────────────
  console.log('🏢 Creating buildings...');

  const cseBuilding = await prisma.building.create({
    data: { code: 'CSE', name: 'CSE Block', totalFloors: 4, description: 'Computer Science and Engineering Department Block' }
  });
  const mainBuilding = await prisma.building.create({
    data: { code: 'MAIN', name: 'Main Block', totalFloors: 3, description: 'Administrative and General Classrooms Block' }
  });
  const sciBuilding = await prisma.building.create({
    data: { code: 'SCI', name: 'Science Block', totalFloors: 3, description: 'Science and Engineering Labs Block' }
  });
  const admBuilding = await prisma.building.create({
    data: { code: 'ADM', name: 'Admin Block', totalFloors: 2, description: 'Administration and Management Block' }
  });
  const libBuilding = await prisma.building.create({
    data: { code: 'LIB', name: 'Library Block', totalFloors: 2, description: 'Central Library and Resource Center' }
  });

  console.log(`✅ Created 5 buildings`);

  // ─────────────────────────────────────────────
  // FLOORS
  // ─────────────────────────────────────────────
  console.log('📐 Creating floors...');

  // CSE Block floors (4)
  const cseFloors = [];
  for (let i = 1; i <= 4; i++) {
    const f = await prisma.floor.create({
      data: { floorNumber: i, name: `CSE Block - Floor ${i}`, buildingId: cseBuilding.id }
    });
    cseFloors.push(f);
  }

  // Main Block floors (3)
  const mainFloors = [];
  for (let i = 1; i <= 3; i++) {
    const f = await prisma.floor.create({
      data: { floorNumber: i, name: `Main Block - Floor ${i}`, buildingId: mainBuilding.id }
    });
    mainFloors.push(f);
  }

  // Science Block floors (3)
  const sciFloors = [];
  for (let i = 1; i <= 3; i++) {
    const f = await prisma.floor.create({
      data: { floorNumber: i, name: `Science Block - Floor ${i}`, buildingId: sciBuilding.id }
    });
    sciFloors.push(f);
  }

  // Admin Block floors (2)
  const admFloors = [];
  for (let i = 1; i <= 2; i++) {
    const f = await prisma.floor.create({
      data: { floorNumber: i, name: `Admin Block - Floor ${i}`, buildingId: admBuilding.id }
    });
    admFloors.push(f);
  }

  // Library Block floors (2)
  const libFloors = [];
  for (let i = 1; i <= 2; i++) {
    const f = await prisma.floor.create({
      data: { floorNumber: i, name: `Library Block - Floor ${i}`, buildingId: libBuilding.id }
    });
    libFloors.push(f);
  }

  console.log(`✅ Created ${cseFloors.length + mainFloors.length + sciFloors.length + admFloors.length + libFloors.length} floors`);

  // ─────────────────────────────────────────────
  // ROOMS (50+)
  // ─────────────────────────────────────────────
  console.log('🚪 Creating rooms...');

  // Helper to build equipment JSON string
  const eq = (items: string[]) => JSON.stringify(items);

  const rooms: RoomRecord[] = [];

  // CSE Block Classrooms (CSE-101 to CSE-410) - 20 classrooms
  const classroomData = [
    // Floor 1
    { code: 'CSE-101', name: 'Classroom 101', type: RoomType.CLASSROOM, capacity: 60, floor: 1, floorId: cseFloors[0].id, equipment: eq(['Projector', 'Whiteboard', 'AC']), department: 'CSE' },
    { code: 'CSE-102', name: 'Classroom 102', type: RoomType.CLASSROOM, capacity: 80, floor: 1, floorId: cseFloors[0].id, equipment: eq(['Projector', 'Smart Board', 'AC', 'CCTV']), department: 'CSE' },
    { code: 'CSE-103', name: 'Classroom 103', type: RoomType.CLASSROOM, capacity: 40, floor: 1, floorId: cseFloors[0].id, equipment: eq(['Projector', 'Whiteboard']), department: 'CSE' },
    { code: 'CSE-104', name: 'Classroom 104', type: RoomType.CLASSROOM, capacity: 120, floor: 1, floorId: cseFloors[0].id, equipment: eq(['Dual Projectors', 'Smart Board', 'AC', 'Microphone']), department: 'CSE' },
    // Floor 2
    { code: 'CSE-201', name: 'Classroom 201', type: RoomType.CLASSROOM, capacity: 60, floor: 2, floorId: cseFloors[1].id, equipment: eq(['Projector', 'Whiteboard', 'AC']), department: 'CSE' },
    { code: 'CSE-202', name: 'Classroom 202', type: RoomType.CLASSROOM, capacity: 60, floor: 2, floorId: cseFloors[1].id, equipment: eq(['Projector', 'Smart Board', 'AC']), department: 'CSE' },
    { code: 'CSE-203', name: 'Classroom 203', type: RoomType.CLASSROOM, capacity: 80, floor: 2, floorId: cseFloors[1].id, equipment: eq(['Projector', 'Whiteboard', 'AC', 'CCTV']), department: 'CSE' },
    { code: 'CSE-204', name: 'Classroom 204', type: RoomType.CLASSROOM, capacity: 60, floor: 2, floorId: cseFloors[1].id, equipment: eq(['Projector', 'Whiteboard']), department: 'CSE' },
    // Floor 3
    { code: 'CSE-301', name: 'Classroom 301', type: RoomType.CLASSROOM, capacity: 60, floor: 3, floorId: cseFloors[2].id, equipment: eq(['Projector', 'Smart Board', 'AC']), department: 'CSE' },
    { code: 'CSE-302', name: 'Classroom 302', type: RoomType.CLASSROOM, capacity: 80, floor: 3, floorId: cseFloors[2].id, equipment: eq(['Projector', 'Whiteboard', 'AC']), department: 'CSE' },
    { code: 'CSE-303', name: 'Classroom 303', type: RoomType.CLASSROOM, capacity: 40, floor: 3, floorId: cseFloors[2].id, equipment: eq(['Projector', 'Whiteboard']), department: 'CSE' },
    // Floor 4
    { code: 'CSE-401', name: 'Classroom 401', type: RoomType.CLASSROOM, capacity: 60, floor: 4, floorId: cseFloors[3].id, equipment: eq(['Projector', 'Smart Board', 'AC']), department: 'CSE' },
    { code: 'CSE-402', name: 'Classroom 402', type: RoomType.CLASSROOM, capacity: 60, floor: 4, floorId: cseFloors[3].id, equipment: eq(['Projector', 'Whiteboard', 'AC']), department: 'CSE' },
    // Main Block Classrooms
    { code: 'MAIN-101', name: 'Main Classroom 101', type: RoomType.CLASSROOM, capacity: 80, floor: 1, floorId: mainFloors[0].id, equipment: eq(['Projector', 'Whiteboard', 'AC']), department: 'GENERAL' },
    { code: 'MAIN-201', name: 'Main Classroom 201', type: RoomType.CLASSROOM, capacity: 80, floor: 2, floorId: mainFloors[1].id, equipment: eq(['Projector', 'Smart Board', 'AC']), department: 'GENERAL' },
    { code: 'MAIN-202', name: 'Main Classroom 202', type: RoomType.CLASSROOM, capacity: 60, floor: 2, floorId: mainFloors[1].id, equipment: eq(['Projector', 'Whiteboard']), department: 'GENERAL' },
    { code: 'MAIN-301', name: 'Main Classroom 301', type: RoomType.CLASSROOM, capacity: 100, floor: 3, floorId: mainFloors[2].id, equipment: eq(['Dual Projectors', 'Smart Board', 'AC', 'Microphone']), department: 'GENERAL' },
    { code: 'SCI-101', name: 'Science Classroom 101', type: RoomType.CLASSROOM, capacity: 60, floor: 1, floorId: sciFloors[0].id, equipment: eq(['Projector', 'Whiteboard', 'AC']), department: 'SCI' },
    { code: 'SCI-201', name: 'Science Classroom 201', type: RoomType.CLASSROOM, capacity: 60, floor: 2, floorId: sciFloors[1].id, equipment: eq(['Projector', 'Smart Board', 'AC']), department: 'SCI' },
    { code: 'SCI-301', name: 'Science Classroom 301', type: RoomType.CLASSROOM, capacity: 80, floor: 3, floorId: sciFloors[2].id, equipment: eq(['Projector', 'Whiteboard', 'AC']), department: 'SCI' },
  ];

  for (const cd of classroomData) {
    const r = await prisma.room.create({
      data: { ...cd, buildingId: cd.type === RoomType.CLASSROOM && cd.code.startsWith('CSE') ? cseBuilding.id : cd.code.startsWith('MAIN') ? mainBuilding.id : sciBuilding.id }
    });
    rooms.push(r);
  }

  // Labs (8)
  const labData = [
    { code: 'CSE-LAB1', name: 'CS Lab 1', type: RoomType.LAB, capacity: 40, floor: 2, floorId: cseFloors[1].id, buildingId: cseBuilding.id, equipment: eq(['40 Computers', 'Projector', 'AC', 'UPS']), department: 'CSE' },
    { code: 'CSE-LAB2', name: 'CS Lab 2 - Networks', type: RoomType.LAB, capacity: 36, floor: 2, floorId: cseFloors[1].id, buildingId: cseBuilding.id, equipment: eq(['36 Computers', 'Network Switches', 'Projector', 'AC']), department: 'CSE' },
    { code: 'CSE-LAB3', name: 'CS Lab 3 - AI/ML', type: RoomType.LAB, capacity: 30, floor: 3, floorId: cseFloors[2].id, buildingId: cseBuilding.id, equipment: eq(['30 High-end Computers', 'GPU Workstations', 'Projector', 'AC']), department: 'CSE' },
    { code: 'CSE-LAB4', name: 'CS Lab 4 - Web Dev', type: RoomType.LAB, capacity: 40, floor: 3, floorId: cseFloors[2].id, buildingId: cseBuilding.id, equipment: eq(['40 Computers', 'Projector', 'AC']), department: 'CSE' },
    { code: 'CSE-LAB5', name: 'CS Lab 5 - Research', type: RoomType.LAB, capacity: 20, floor: 4, floorId: cseFloors[3].id, buildingId: cseBuilding.id, equipment: eq(['20 Workstations', 'Servers', 'AC']), department: 'CSE' },
    { code: 'SCI-LAB1', name: 'Physics Lab', type: RoomType.LAB, capacity: 30, floor: 1, floorId: sciFloors[0].id, buildingId: sciBuilding.id, equipment: eq(['Lab Equipment', 'Fume Hood', 'Safety Shower']), department: 'SCI' },
    { code: 'SCI-LAB2', name: 'Chemistry Lab', type: RoomType.LAB, capacity: 30, floor: 2, floorId: sciFloors[1].id, buildingId: sciBuilding.id, equipment: eq(['Lab Benches', 'Fume Hood', 'Safety Shower', 'Fire Extinguisher']), department: 'SCI' },
    { code: 'SCI-LAB3', name: 'Electronics Lab', type: RoomType.LAB, capacity: 35, floor: 3, floorId: sciFloors[2].id, buildingId: sciBuilding.id, equipment: eq(['Oscilloscopes', 'Function Generators', 'Bread Boards', 'Projector']), department: 'ECE' },
  ];

  for (const ld of labData) {
    const r = await prisma.room.create({ data: ld });
    rooms.push(r);
  }

  // Faculty Cabins (10)
  const cabinData = [
    { code: 'CSE-FC101', name: 'Faculty Cabin 101', type: RoomType.FACULTY_CABIN, capacity: 3, floor: 1, floorId: cseFloors[0].id, buildingId: cseBuilding.id, equipment: eq(['Computer', 'AC']), department: 'CSE' },
    { code: 'CSE-FC102', name: 'Faculty Cabin 102', type: RoomType.FACULTY_CABIN, capacity: 3, floor: 1, floorId: cseFloors[0].id, buildingId: cseBuilding.id, equipment: eq(['Computer', 'AC']), department: 'CSE' },
    { code: 'CSE-FC201', name: 'Faculty Cabin 201', type: RoomType.FACULTY_CABIN, capacity: 3, floor: 2, floorId: cseFloors[1].id, buildingId: cseBuilding.id, equipment: eq(['Computer', 'AC']), department: 'CSE' },
    { code: 'CSE-FC202', name: 'Faculty Cabin 202', type: RoomType.FACULTY_CABIN, capacity: 3, floor: 2, floorId: cseFloors[1].id, buildingId: cseBuilding.id, equipment: eq(['Computer', 'AC']), department: 'CSE' },
    { code: 'CSE-FC301', name: 'Faculty Cabin 301 - HOD', type: RoomType.FACULTY_CABIN, capacity: 5, floor: 3, floorId: cseFloors[2].id, buildingId: cseBuilding.id, equipment: eq(['Computer', 'AC', 'Meeting Table']), department: 'CSE' },
    { code: 'CSE-FC302', name: 'Faculty Cabin 302', type: RoomType.FACULTY_CABIN, capacity: 3, floor: 3, floorId: cseFloors[2].id, buildingId: cseBuilding.id, equipment: eq(['Computer', 'AC']), department: 'CSE' },
    { code: 'MAIN-FC101', name: 'Principal Office', type: RoomType.FACULTY_CABIN, capacity: 5, floor: 1, floorId: mainFloors[0].id, buildingId: mainBuilding.id, equipment: eq(['Computer', 'AC', 'Conference Table']), department: 'ADMIN' },
    { code: 'MAIN-FC201', name: 'Vice Principal Office', type: RoomType.FACULTY_CABIN, capacity: 4, floor: 2, floorId: mainFloors[1].id, buildingId: mainBuilding.id, equipment: eq(['Computer', 'AC']), department: 'ADMIN' },
    { code: 'SCI-FC101', name: 'Science Faculty Cabin 101', type: RoomType.FACULTY_CABIN, capacity: 3, floor: 1, floorId: sciFloors[0].id, buildingId: sciBuilding.id, equipment: eq(['Computer', 'AC']), department: 'SCI' },
    { code: 'SCI-FC201', name: 'Science Faculty Cabin 201', type: RoomType.FACULTY_CABIN, capacity: 3, floor: 2, floorId: sciFloors[1].id, buildingId: sciBuilding.id, equipment: eq(['Computer', 'AC']), department: 'SCI' },
  ];
  for (const cd of cabinData) {
    const r = await prisma.room.create({ data: cd });
    rooms.push(r);
  }

  // Offices (5)
  const officeData = [
    { code: 'ADM-OFF101', name: 'Admissions Office', type: RoomType.OFFICE, capacity: 10, floor: 1, floorId: admFloors[0].id, buildingId: admBuilding.id, equipment: eq(['Computers', 'Printers', 'AC']), department: 'ADMIN' },
    { code: 'ADM-OFF102', name: 'Examination Office', type: RoomType.OFFICE, capacity: 8, floor: 1, floorId: admFloors[0].id, buildingId: admBuilding.id, equipment: eq(['Computers', 'AC']), department: 'ADMIN' },
    { code: 'ADM-OFF201', name: 'Finance Office', type: RoomType.OFFICE, capacity: 6, floor: 2, floorId: admFloors[1].id, buildingId: admBuilding.id, equipment: eq(['Computers', 'AC', 'Safe']), department: 'ADMIN' },
    { code: 'CSE-OFF301', name: 'CSE Department Office', type: RoomType.OFFICE, capacity: 5, floor: 3, floorId: cseFloors[2].id, buildingId: cseBuilding.id, equipment: eq(['Computers', 'Printer', 'AC']), department: 'CSE' },
    { code: 'MAIN-OFF101', name: 'General Office', type: RoomType.OFFICE, capacity: 8, floor: 1, floorId: mainFloors[0].id, buildingId: mainBuilding.id, equipment: eq(['Computers', 'Printers', 'AC']), department: 'ADMIN' },
  ];
  for (const od of officeData) {
    const r = await prisma.room.create({ data: od });
    rooms.push(r);
  }

  // Restrooms (6 - ladies + men per building)
  const restroomData = [
    { code: 'CSE-WR1L', name: "CSE Block Women's Restroom F1", type: RoomType.RESTROOM, capacity: 5, floor: 1, floorId: cseFloors[0].id, buildingId: cseBuilding.id, equipment: eq(['Sanitary Napkin Dispenser']), description: "Ladies' Restroom" },
    { code: 'CSE-WR1M', name: "CSE Block Men's Restroom F1", type: RoomType.RESTROOM, capacity: 5, floor: 1, floorId: cseFloors[0].id, buildingId: cseBuilding.id, equipment: eq([]), description: "Men's Restroom" },
    { code: 'CSE-WR2L', name: "CSE Block Women's Restroom F2", type: RoomType.RESTROOM, capacity: 5, floor: 2, floorId: cseFloors[1].id, buildingId: cseBuilding.id, equipment: eq(['Sanitary Napkin Dispenser']), description: "Ladies' Restroom" },
    { code: 'CSE-WR2M', name: "CSE Block Men's Restroom F2", type: RoomType.RESTROOM, capacity: 5, floor: 2, floorId: cseFloors[1].id, buildingId: cseBuilding.id, equipment: eq([]), description: "Men's Restroom" },
    { code: 'MAIN-WR1L', name: "Main Block Women's Restroom", type: RoomType.RESTROOM, capacity: 8, floor: 1, floorId: mainFloors[0].id, buildingId: mainBuilding.id, equipment: eq(['Sanitary Napkin Dispenser', 'Baby Changing Station']), description: "Ladies' Restroom" },
    { code: 'MAIN-WR1M', name: "Main Block Men's Restroom", type: RoomType.RESTROOM, capacity: 8, floor: 1, floorId: mainFloors[0].id, buildingId: mainBuilding.id, equipment: eq([]), description: "Men's Restroom" },
  ];
  for (const rd of restroomData) {
    const r = await prisma.room.create({ data: rd });
    rooms.push(r);
  }

  // Staff Rooms (2)
  const staffRoomData = [
    { code: 'CSE-SR301', name: 'CSE Staff Room', type: RoomType.STAFF_ROOM, capacity: 20, floor: 3, floorId: cseFloors[2].id, buildingId: cseBuilding.id, equipment: eq(['Computers', 'Printers', 'Coffee Machine', 'AC']), department: 'CSE' },
    { code: 'MAIN-SR101', name: 'Main Block Staff Room', type: RoomType.STAFF_ROOM, capacity: 30, floor: 1, floorId: mainFloors[0].id, buildingId: mainBuilding.id, equipment: eq(['Computers', 'Printers', 'AC']), department: 'GENERAL' },
  ];
  for (const sr of staffRoomData) {
    const r = await prisma.room.create({ data: sr });
    rooms.push(r);
  }

  // Seminar Halls (2)
  const seminarData = [
    { code: 'CSE-SH401', name: 'CSE Seminar Hall', type: RoomType.SEMINAR_HALL, capacity: 150, floor: 4, floorId: cseFloors[3].id, buildingId: cseBuilding.id, equipment: eq(['Projector', 'Stage', 'Sound System', 'AC', 'Microphones', 'CCTV']), department: 'CSE' },
    { code: 'MAIN-SH301', name: 'Main Seminar Hall', type: RoomType.SEMINAR_HALL, capacity: 200, floor: 3, floorId: mainFloors[2].id, buildingId: mainBuilding.id, equipment: eq(['Dual Projectors', 'Stage', 'Professional Sound System', 'AC', 'Wireless Microphones', 'CCTV', 'Recording Equipment']), department: 'GENERAL' },
  ];
  for (const sh of seminarData) {
    const r = await prisma.room.create({ data: sh });
    rooms.push(r);
  }

  // Auditorium (1)
  const auditorium = await prisma.room.create({
    data: {
      code: 'MAIN-AUD', name: 'College Auditorium', type: RoomType.AUDITORIUM,
      capacity: 500, floor: 1, floorId: mainFloors[0].id, buildingId: mainBuilding.id,
      equipment: eq(['Stage', 'Professional Sound System', 'Lighting Rig', 'Projector Screen', 'Green Room', 'AC', 'CCTV']),
      department: 'GENERAL'
    }
  });
  rooms.push(auditorium);

  // Library (1)
  const library = await prisma.room.create({
    data: {
      code: 'LIB-MAIN', name: 'Central Library', type: RoomType.LIBRARY,
      capacity: 200, floor: 1, floorId: libFloors[0].id, buildingId: libBuilding.id,
      equipment: eq(['Reading Desks', 'Computer Terminals', 'Barcode Scanners', 'RFID System', 'AC', 'CCTV']),
      department: 'LIBRARY'
    }
  });
  rooms.push(library);

  const totalRooms = await prisma.room.count();
  console.log(`✅ Created ${totalRooms} rooms`);

  // ─────────────────────────────────────────────
  // DEPARTMENTS (6)
  // ─────────────────────────────────────────────
  console.log('🏛️ Creating departments...');

  const cseDept = await prisma.department.create({
    data: { code: 'CSE', name: 'Computer Science and Engineering', hodId: admin1.id }
  });
  const eceDept = await prisma.department.create({
    data: { code: 'ECE', name: 'Electronics and Communication Engineering', hodId: admin2.id }
  });
  const mechDept = await prisma.department.create({
    data: { code: 'MECH', name: 'Mechanical Engineering' }
  });
  const civilDept = await prisma.department.create({
    data: { code: 'CIVIL', name: 'Civil Engineering' }
  });
  const mbaDept = await prisma.department.create({
    data: { code: 'MBA', name: 'Master of Business Administration' }
  });
  const mcaDept = await prisma.department.create({
    data: { code: 'MCA', name: 'Master of Computer Applications' }
  });

  console.log(`✅ Created 6 departments`);

  // ─────────────────────────────────────────────
  // SUBJECTS (8 per CSE dept)
  // ─────────────────────────────────────────────
  console.log('📚 Creating subjects...');

  const cseSubjects = await Promise.all([
    prisma.subject.create({ data: { code: '21CS301', name: 'Data Structures', credits: 4, departmentId: cseDept.id, semester: 3 } }),
    prisma.subject.create({ data: { code: '21CS302', name: 'Database Management Systems', credits: 4, departmentId: cseDept.id, semester: 3 } }),
    prisma.subject.create({ data: { code: '21CS401', name: 'Operating Systems', credits: 4, departmentId: cseDept.id, semester: 4 } }),
    prisma.subject.create({ data: { code: '21CS402', name: 'Computer Networks', credits: 4, departmentId: cseDept.id, semester: 4 } }),
    prisma.subject.create({ data: { code: '21CS501', name: 'Compiler Design', credits: 3, departmentId: cseDept.id, semester: 5 } }),
    prisma.subject.create({ data: { code: '21CS502', name: 'Artificial Intelligence', credits: 3, departmentId: cseDept.id, semester: 5 } }),
    prisma.subject.create({ data: { code: '21CS503', name: 'Theory of Computation', credits: 3, departmentId: cseDept.id, semester: 5 } }),
    prisma.subject.create({ data: { code: '21CS504', name: 'Software Engineering', credits: 3, departmentId: cseDept.id, semester: 5 } }),
  ]);

  // Additional subjects for sem 3
  const cseSubjectsSem3 = [cseSubjects[0], cseSubjects[1]];
  const cseSubjectsSem5 = [cseSubjects[4], cseSubjects[5], cseSubjects[6], cseSubjects[7]];

  console.log(`✅ Created ${cseSubjects.length} subjects`);

  // ─────────────────────────────────────────────
  // SEMESTERS (2)
  // ─────────────────────────────────────────────
  console.log('📅 Creating semesters...');

  const activeSemester = await prisma.semester.create({
    data: {
      type: SemesterType.ODD,
      academicYear: '2026-27',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-31'),
      isActive: true
    }
  });
  const prevSemester = await prisma.semester.create({
    data: {
      type: SemesterType.EVEN,
      academicYear: '2025-26',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-05-31'),
      isActive: false
    }
  });

  console.log(`✅ Created 2 semesters`);

  // ─────────────────────────────────────────────
  // CLASSES (3)
  // ─────────────────────────────────────────────
  console.log('🎓 Creating classes...');

  const classSem5A = await prisma.class.create({
    data: {
      name: 'CSE Sem 5 - Section A',
      departmentId: cseDept.id,
      semesterId: activeSemester.id,
      semesterNumber: 5,
      section: 'A',
      strength: 54
    }
  });
  const classSem3A = await prisma.class.create({
    data: {
      name: 'CSE Sem 3 - Section A',
      departmentId: cseDept.id,
      semesterId: activeSemester.id,
      semesterNumber: 3,
      section: 'A',
      strength: 60
    }
  });
  const classSem3B = await prisma.class.create({
    data: {
      name: 'CSE Sem 3 - Section B',
      departmentId: cseDept.id,
      semesterId: activeSemester.id,
      semesterNumber: 3,
      section: 'B',
      strength: 58
    }
  });

  console.log(`✅ Created 3 classes`);

  // ─────────────────────────────────────────────
  // TIMETABLE ENTRIES (Mon-Sat, 8 periods for all 3 classes)
  // ─────────────────────────────────────────────
  console.log('📋 Creating timetable entries...');

  const days = [DayOfWeek.MON, DayOfWeek.TUE, DayOfWeek.WED, DayOfWeek.THU, DayOfWeek.FRI, DayOfWeek.SAT];
  const periodTimes: { start: string; end: string }[] = [
    { start: '08:00', end: '09:00' },
    { start: '09:00', end: '10:00' },
    { start: '10:00', end: '11:00' },
    { start: '11:15', end: '12:15' },
    { start: '12:15', end: '13:15' },
    { start: '14:00', end: '15:00' },
    { start: '15:00', end: '16:00' },
    { start: '16:00', end: '17:00' },
  ];

  // Room lookups by code for timetable
  const getRoomByCode = (code: string) => rooms.find(r => r.code === code);

  // Subjects for sem5A: Compiler Design, AI, TOC, SE, DBMS, OS, CN, DS
  // Assign faculty and rooms - cycle through available rooms >= 54 capacity
  const sem5Rooms = [
    getRoomByCode('CSE-201')!, getRoomByCode('CSE-202')!, getRoomByCode('CSE-203')!,
    getRoomByCode('CSE-301')!, getRoomByCode('CSE-302')!
  ];
  const sem3ARooms = [
    getRoomByCode('CSE-101')!, getRoomByCode('CSE-102')!, getRoomByCode('CSE-104')!
  ];
  const sem3BRooms = [
    getRoomByCode('MAIN-101')!, getRoomByCode('MAIN-201')!, getRoomByCode('SCI-101')!
  ];

  // Subjects cycling
  const sem5Subjects = [cseSubjects[4], cseSubjects[5], cseSubjects[6], cseSubjects[7], cseSubjects[2], cseSubjects[3], cseSubjects[1], cseSubjects[0]];
  const sem3ASubjects = [cseSubjects[0], cseSubjects[1], cseSubjects[2], cseSubjects[3], cseSubjects[4], cseSubjects[5], cseSubjects[6], cseSubjects[7]];
  const sem3BSubjects = [cseSubjects[1], cseSubjects[0], cseSubjects[3], cseSubjects[2], cseSubjects[5], cseSubjects[4], cseSubjects[7], cseSubjects[6]];

  let ttCount = 0;
  for (const day of days) {
    for (let period = 1; period <= 8; period++) {
      const pt = periodTimes[period - 1];
      const subIdx = (period - 1) % sem5Subjects.length;
      const roomIdx = (period - 1) % sem5Rooms.length;
      const facIdx = period % faculty.length;

      // Sem5A entries
      await prisma.timetableEntry.create({
        data: {
          classId: classSem5A.id,
          subjectId: sem5Subjects[subIdx].id,
          facultyId: faculty[facIdx].id,
          roomId: sem5Rooms[roomIdx].id,
          semesterId: activeSemester.id,
          day,
          period,
          startTime: pt.start,
          endTime: pt.end
        }
      });
      ttCount++;

      // Sem3A entries (use different rooms and faculty to avoid conflicts)
      const room3AIdx = (period - 1) % sem3ARooms.length;
      const fac3AIdx = (period + 5) % faculty.length;
      await prisma.timetableEntry.create({
        data: {
          classId: classSem3A.id,
          subjectId: sem3ASubjects[subIdx].id,
          facultyId: faculty[fac3AIdx].id,
          roomId: sem3ARooms[room3AIdx].id,
          semesterId: activeSemester.id,
          day,
          period,
          startTime: pt.start,
          endTime: pt.end
        }
      });
      ttCount++;

      // Sem3B entries
      const room3BIdx = (period - 1) % sem3BRooms.length;
      const fac3BIdx = (period + 10) % faculty.length;
      await prisma.timetableEntry.create({
        data: {
          classId: classSem3B.id,
          subjectId: sem3BSubjects[subIdx].id,
          facultyId: faculty[fac3BIdx].id,
          roomId: sem3BRooms[room3BIdx].id,
          semesterId: activeSemester.id,
          day,
          period,
          startTime: pt.start,
          endTime: pt.end
        }
      });
      ttCount++;
    }
  }

  const totalTT = await prisma.timetableEntry.count();
  console.log(`✅ Created ${totalTT} timetable entries`);

  // ─────────────────────────────────────────────
  // RESOURCES (20+ question papers)
  // ─────────────────────────────────────────────
  console.log('📄 Creating resources...');

  const resourceData = [
    // 2023 Question Papers
    { title: 'DBMS End Semester Exam 2023', subjectId: cseSubjects[1].id, examType: ExamType.END_SEM, academicYear: '2022-23', semester: 3, regulation: '2021' },
    { title: 'Operating Systems End Semester 2023', subjectId: cseSubjects[2].id, examType: ExamType.END_SEM, academicYear: '2022-23', semester: 4, regulation: '2021' },
    { title: 'Computer Networks Internal Test 2023', subjectId: cseSubjects[3].id, examType: ExamType.INTERNAL, academicYear: '2022-23', semester: 4, regulation: '2021' },
    { title: 'Data Structures End Semester 2023', subjectId: cseSubjects[0].id, examType: ExamType.END_SEM, academicYear: '2022-23', semester: 3, regulation: '2021' },
    { title: 'Compiler Design End Semester 2023', subjectId: cseSubjects[4].id, examType: ExamType.END_SEM, academicYear: '2022-23', semester: 5, regulation: '2021' },
    // 2024 Question Papers
    { title: 'DBMS End Semester Exam 2024', subjectId: cseSubjects[1].id, examType: ExamType.END_SEM, academicYear: '2023-24', semester: 3, regulation: '2021' },
    { title: 'Artificial Intelligence End Semester 2024', subjectId: cseSubjects[5].id, examType: ExamType.END_SEM, academicYear: '2023-24', semester: 5, regulation: '2021' },
    { title: 'Theory of Computation Internal 2024', subjectId: cseSubjects[6].id, examType: ExamType.INTERNAL, academicYear: '2023-24', semester: 5, regulation: '2021' },
    { title: 'Software Engineering End Semester 2024', subjectId: cseSubjects[7].id, examType: ExamType.END_SEM, academicYear: '2023-24', semester: 5, regulation: '2021' },
    { title: 'Operating Systems Internal Test 1 - 2024', subjectId: cseSubjects[2].id, examType: ExamType.INTERNAL, academicYear: '2023-24', semester: 4, regulation: '2021' },
    { title: 'Computer Networks End Semester 2024', subjectId: cseSubjects[3].id, examType: ExamType.END_SEM, academicYear: '2023-24', semester: 4, regulation: '2021' },
    // 2025 Question Papers
    { title: 'DBMS End Semester Exam 2025', subjectId: cseSubjects[1].id, examType: ExamType.END_SEM, academicYear: '2024-25', semester: 3, regulation: '2021' },
    { title: 'Compiler Design Internal Test 2025', subjectId: cseSubjects[4].id, examType: ExamType.INTERNAL, academicYear: '2024-25', semester: 5, regulation: '2021' },
    { title: 'AI Lab Manual 2025', subjectId: cseSubjects[5].id, examType: ExamType.LAB_MANUAL, academicYear: '2024-25', semester: 5, regulation: '2021' },
    { title: 'Data Structures Assignment Questions 2025', subjectId: cseSubjects[0].id, examType: ExamType.ASSIGNMENT, academicYear: '2024-25', semester: 3, regulation: '2021' },
    { title: 'TOC Study Notes 2025', subjectId: cseSubjects[6].id, examType: ExamType.NOTES, academicYear: '2024-25', semester: 5, regulation: '2021' },
    { title: 'SE Module-wise Notes 2025', subjectId: cseSubjects[7].id, examType: ExamType.NOTES, academicYear: '2024-25', semester: 5, regulation: '2021' },
    { title: 'CN Lab Programs 2025', subjectId: cseSubjects[3].id, examType: ExamType.LAB_MANUAL, academicYear: '2024-25', semester: 4, regulation: '2021' },
    { title: 'OS Internal Test 2 - 2025', subjectId: cseSubjects[2].id, examType: ExamType.INTERNAL, academicYear: '2024-25', semester: 4, regulation: '2021' },
    { title: 'DS Lab Manual 2025', subjectId: cseSubjects[0].id, examType: ExamType.LAB_MANUAL, academicYear: '2024-25', semester: 3, regulation: '2021' },
  ];

  const uploaderId = faculty[0].id;
  for (const rd of resourceData) {
    await prisma.resource.create({
      data: {
        title: rd.title,
        subjectId: rd.subjectId,
        departmentId: cseDept.id,
        semester: rd.semester,
        academicYear: rd.academicYear,
        examType: rd.examType,
        regulation: rd.regulation,
        uploadedById: uploaderId,
        fileUrl: '/uploads/resources/sample.pdf',
        fileName: `${rd.title.replace(/\s+/g, '_')}.pdf`,
        fileSize: 1024 * 512, // 512KB placeholder
        fileType: 'application/pdf',
        isApproved: true,
        isPublic: true
      }
    });
  }

  const totalResources = await prisma.resource.count();
  console.log(`✅ Created ${totalResources} resources`);

  // ─────────────────────────────────────────────
  // COMPLAINTS (10+)
  // ─────────────────────────────────────────────
  console.log('🔧 Creating complaints...');

  const complaintData = [
    { autoId: 'CMP-2026-001', category: ComplaintCategory.PROJECTOR, description: 'Projector in CSE-301 is not working. Bulb appears burnt out.', priority: ComplaintPriority.HIGH, status: ComplaintStatus.ASSIGNED, roomCode: 'CSE-301' },
    { autoId: 'CMP-2026-002', category: ComplaintCategory.AC, description: 'AC in CSE-201 is leaking water.', priority: ComplaintPriority.HIGH, status: ComplaintStatus.IN_PROGRESS, roomCode: 'CSE-201' },
    { autoId: 'CMP-2026-003', category: ComplaintCategory.COMPUTER, description: '5 computers in CSE-LAB1 have broken keyboards.', priority: ComplaintPriority.MEDIUM, status: ComplaintStatus.OPEN, roomCode: 'CSE-LAB1' },
    { autoId: 'CMP-2026-004', category: ComplaintCategory.FAN_LIGHT, description: 'Tube lights in CSE-102 are flickering.', priority: ComplaintPriority.LOW, status: ComplaintStatus.RESOLVED, roomCode: 'CSE-102' },
    { autoId: 'CMP-2026-005', category: ComplaintCategory.NETWORK, description: 'WiFi is extremely slow in CSE Block Floor 2.', priority: ComplaintPriority.MEDIUM, status: ComplaintStatus.OPEN, roomCode: 'CSE-204' },
    { autoId: 'CMP-2026-006', category: ComplaintCategory.WATER, description: 'Water cooler on Floor 1 of Main Block is not working.', priority: ComplaintPriority.MEDIUM, status: ComplaintStatus.ASSIGNED, roomCode: 'MAIN-101' },
    { autoId: 'CMP-2026-007', category: ComplaintCategory.CLASSROOM_DAMAGE, description: 'Chairs in MAIN-201 are broken. About 10 chairs need replacement.', priority: ComplaintPriority.MEDIUM, status: ComplaintStatus.IN_PROGRESS, roomCode: 'MAIN-201' },
    { autoId: 'CMP-2026-008', category: ComplaintCategory.ELECTRICAL, description: 'Power fluctuations in Science Block LAB1.', priority: ComplaintPriority.CRITICAL, status: ComplaintStatus.IN_PROGRESS, roomCode: 'SCI-LAB1' },
    { autoId: 'CMP-2026-009', category: ComplaintCategory.RESTROOM, description: "Women's restroom on CSE Floor 1 needs cleaning urgently.", priority: ComplaintPriority.HIGH, status: ComplaintStatus.RESOLVED, roomCode: 'CSE-WR1L' },
    { autoId: 'CMP-2026-010', category: ComplaintCategory.PROJECTOR, description: 'Smart board in CSE-401 is not responding to touch.', priority: ComplaintPriority.MEDIUM, status: ComplaintStatus.OPEN, roomCode: 'CSE-401' },
    { autoId: 'CMP-2026-011', category: ComplaintCategory.EQUIPMENT, description: 'Oscilloscopes in SCI-LAB3 are damaged.', priority: ComplaintPriority.HIGH, status: ComplaintStatus.ASSIGNED, roomCode: 'SCI-LAB3' },
    { autoId: 'CMP-2026-012', category: ComplaintCategory.AC, description: 'AC remote missing from CSE-302.', priority: ComplaintPriority.LOW, status: ComplaintStatus.CLOSED, roomCode: 'CSE-302' },
  ];

  for (const cd of complaintData) {
    const room = rooms.find(r => r.code === cd.roomCode);
    await prisma.complaint.create({
      data: {
        autoId: cd.autoId,
        category: cd.category,
        description: cd.description,
        priority: cd.priority,
        status: cd.status,
        reporterId: students[0].id,
        buildingId: room?.buildingId,
        roomId: room?.id,
        floorId: room?.floorId,
        assignedToId: cd.status !== ComplaintStatus.OPEN ? admin1.id : null,
      }
    });
  }

  const totalComplaints = await prisma.complaint.count();
  console.log(`✅ Created ${totalComplaints} complaints`);

  // ─────────────────────────────────────────────
  // ENERGY RECORDS (30 days × 24 hours × 5 buildings = 3600)
  // ─────────────────────────────────────────────
  console.log('⚡ Creating energy records (3600)...');

  const buildings = [cseBuilding, mainBuilding, sciBuilding, admBuilding, libBuilding];
  const energyBatch: Array<{
    buildingId: string;
    date: Date;
    hour: number;
    consumptionKwh: number;
    isAnomaly: boolean;
  }> = [];

  const now = new Date('2026-10-01');

  for (const building of buildings) {
    for (let day = 0; day < 30; day++) {
      const recordDate = new Date(now);
      recordDate.setDate(now.getDate() - day);

      for (let hour = 0; hour < 24; hour++) {
        // Simulate realistic energy consumption
        let base = 2.0;
        if (hour >= 8 && hour <= 17) {
          // Working hours: higher consumption
          base = 8.0 + Math.random() * 7.0;
        } else if (hour >= 6 && hour < 8) {
          base = 3.0 + Math.random() * 2.0;
        } else if (hour >= 18 && hour <= 21) {
          base = 4.0 + Math.random() * 3.0;
        } else {
          base = 2.0 + Math.random() * 1.5;
        }

        // Occasional anomaly (5% chance)
        const isAnomaly = Math.random() < 0.05;
        const consumption = isAnomaly ? base * (2 + Math.random() * 3) : base;

        energyBatch.push({
          buildingId: building.id,
          date: recordDate,
          hour,
          consumptionKwh: parseFloat(consumption.toFixed(2)),
          isAnomaly
        });
      }
    }
  }

  // Insert in chunks for performance
  const chunkSize = 500;
  for (let i = 0; i < energyBatch.length; i += chunkSize) {
    const chunk = energyBatch.slice(i, i + chunkSize);
    await prisma.energyRecord.createMany({ data: chunk });
    if ((i / chunkSize) % 4 === 0) {
      console.log(`  ⚡ Inserted ${Math.min(i + chunkSize, energyBatch.length)}/${energyBatch.length} energy records...`);
    }
  }

  const totalEnergy = await prisma.energyRecord.count();
  console.log(`✅ Created ${totalEnergy} energy records`);

  // ─────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────
  const summary = {
    users: await prisma.user.count(),
    buildings: await prisma.building.count(),
    floors: await prisma.floor.count(),
    rooms: await prisma.room.count(),
    departments: await prisma.department.count(),
    subjects: await prisma.subject.count(),
    semesters: await prisma.semester.count(),
    classes: await prisma.class.count(),
    timetableEntries: await prisma.timetableEntry.count(),
    resources: await prisma.resource.count(),
    complaints: await prisma.complaint.count(),
    energyRecords: await prisma.energyRecord.count(),
  };

  console.log('\n🎉 CAMPUS-X Seed Complete!');
  console.log('═══════════════════════════');
  Object.entries(summary).forEach(([key, val]) => {
    console.log(`  ${key.padEnd(20)}: ${val}`);
  });
  console.log('═══════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
