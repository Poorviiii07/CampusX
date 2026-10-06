/**
 * Seed script: Real 7th Semester Timetable (CSE, 2026-27 Odd)
 * Sections A, B, C, D
 *
 * Room naming convention (from PDF):
 *   CS<floor><roomNum>  e.g. CS14 = CSE Block, Floor 1, Room 4
 *                            CS25 = CSE Block, Floor 2, Room 5
 *   CSL<floor><roomNum> e.g. CSL33 = CSE Block, Floor 3, Lab 3
 *                            CSL45 = CSE Block, Floor 4, Lab 5
 *
 * Time slots (8 periods):
 *   1: 09:00-09:55  2: 09:55-10:50  [break 10:50-11:10]
 *   3: 11:10-12:05  4: 12:05-13:00  [lunch 13:00-13:55]
 *   5: 13:55-14:50  6: 14:50-15:40  7: 15:40-16:30
 */

import {
  PrismaClient,
  RoomType,
  DayOfWeek,
  SemesterType,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

function periodTime(p: number): { startTime: string; endTime: string } {
  const slots: Record<number, [string, string]> = {
    1: ['09:00', '09:55'],
    2: ['09:55', '10:50'],
    3: ['11:10', '12:05'],
    4: ['12:05', '13:00'],
    5: ['13:55', '14:50'],
    6: ['14:50', '15:40'],
    7: ['15:40', '16:30'],
  };
  const [s, e] = slots[p] ?? ['00:00', '00:00'];
  return { startTime: s, endTime: e };
}

/** Parse a room code like CS14, CS25, CSL33, CSL45 → floor number */
function floorFromCode(code: string): number {
  // CSL<floor><num>  e.g. CSL33 → floor 3
  // CS<floor><num>   e.g. CS14  → floor 1
  const labMatch = code.match(/^CSL(\d)/);
  if (labMatch) return parseInt(labMatch[1], 10);
  const classMatch = code.match(/^CS(\d)/);
  if (classMatch) return parseInt(classMatch[1], 10);
  return 1;
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding 7th Semester real timetable...');

  // ── 1. Find / create CSE Department ────────────────────────────────────────
  let cseDept = await prisma.department.findFirst({ where: { code: 'CSE' } });
  if (!cseDept) {
    cseDept = await prisma.department.create({
      data: { name: 'Computer Science & Engineering', code: 'CSE' },
    });
  }
  console.log(`  dept: ${cseDept.name} (${cseDept.id})`);

  // ── 2. Find CSE Building ────────────────────────────────────────────────────
  const cseBuilding = await prisma.building.findFirst({ where: { code: 'CSE' } });
  if (!cseBuilding) throw new Error('CSE Building not found – run main seed first');

  // ── 3. Ensure floors 1-4 exist for CSE block ───────────────────────────────
  const floorMap: Record<number, string> = {}; // floorNumber → id
  for (let n = 1; n <= 4; n++) {
    let floor = await prisma.floor.findFirst({
      where: { buildingId: cseBuilding.id, floorNumber: n },
    });
    if (!floor) {
      floor = await prisma.floor.create({
        data: {
          floorNumber: n,
          name: `CSE Block - Floor ${n}`,
          buildingId: cseBuilding.id,
        },
      });
    }
    floorMap[n] = floor.id;
  }

  // ── 4. Room definitions from timetable ─────────────────────────────────────
  // Classrooms referenced in PDF (CS<floor><room>):
  //   CS11, CS12, CS13, CS14, CS15, CS16
  //   CS21, CS22, CS23, CS24, CS25, CS26
  //   CS13 (floor 1 room 3)  etc.
  // Labs:
  //   CSL33, CSL35, CSL45
  // "26" as room in elective columns = classroom 26 on that floor (treated as CS_26)

  const roomDefs: {
    code: string;
    name: string;
    type: RoomType;
    capacity: number;
    lab: boolean;
  }[] = [
    // Floor 1 classrooms
    { code: 'CS11', name: 'Classroom 11', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS12', name: 'Classroom 12', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS13', name: 'Classroom 13', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS14', name: 'Classroom 14', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS15', name: 'Classroom 15', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS16', name: 'Classroom 16', type: 'CLASSROOM', capacity: 65, lab: false },
    // Floor 2 classrooms
    { code: 'CS21', name: 'Classroom 21', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS22', name: 'Classroom 22', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS23', name: 'Classroom 23', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS24', name: 'Classroom 24', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS25', name: 'Classroom 25', type: 'CLASSROOM', capacity: 65, lab: false },
    { code: 'CS26', name: 'Classroom 26', type: 'CLASSROOM', capacity: 65, lab: false },
    // Floor 3 labs
    { code: 'CSL33', name: 'Computer Lab 33', type: 'LAB', capacity: 40, lab: true },
    { code: 'CSL35', name: 'Computer Lab 35', type: 'LAB', capacity: 40, lab: true },
    // Floor 4 lab
    { code: 'CSL45', name: 'Computer Lab 45', type: 'LAB', capacity: 40, lab: true },
  ];

  const roomIdMap: Record<string, string> = {}; // roomCode → id

  for (const rd of roomDefs) {
    const floorNum = floorFromCode(rd.code);
    const floorId = floorMap[floorNum];
    if (!floorId) {
      console.warn(`  ⚠ No floor found for code ${rd.code}, skipping`);
      continue;
    }
    let room = await prisma.room.findFirst({ where: { code: rd.code } });
    if (!room) {
      room = await prisma.room.create({
        data: {
          code: rd.code,
          name: rd.name,
          type: rd.type as RoomType,
          capacity: rd.capacity,
          floor: floorNum,
          floorId,
          buildingId: cseBuilding.id,
          department: 'CSE',
          equipment: rd.lab
            ? JSON.stringify(['Projector', 'Computers', '40 PCs'])
            : JSON.stringify(['Projector']),
          status: 'AVAILABLE',
          isActive: true,
        },
      });
      console.log(`  + room ${rd.code}`);
    }
    roomIdMap[rd.code] = room.id;
  }

  // ── 5. Faculty from timetable ───────────────────────────────────────────────
  // Create real faculty users matching the PDF names
  const facultyDefs = [
    { name: 'Ms. Shilpa M K',         email: 'shilpa.mk@campusx.edu' },
    { name: 'Dr. Shabari Shedthi B',  email: 'shabari.shedthi@campusx.edu' },
    { name: 'Mr. Keerthan Dixit',     email: 'keerthan.dixit@campusx.edu' },
    { name: 'Mr. Basavangouda',       email: 'basavangouda@campusx.edu' },
    { name: 'Dr. Minu P A',           email: 'minu.pa@campusx.edu' },
    { name: 'Dr. Savitha',            email: 'savitha@campusx.edu' },
    { name: 'Mr. Pawan Hegde',        email: 'pawan.hegde@campusx.edu' },
    { name: 'Dr. Govindraj P',        email: 'govindraj.p@campusx.edu' },
    { name: 'Mr. Sampath Kini',       email: 'sampath.kini@campusx.edu' },
    { name: 'Mr. Akhilraj V Gadagkar',email: 'akhilraj.gadagkar@campusx.edu' },
    { name: 'Ms. Sowmya S',           email: 'sowmya.s@campusx.edu' },
    { name: 'Ms. Anupama H C',        email: 'anupama.hc@campusx.edu' },
    { name: 'Dr. Vijaya Murari T',    email: 'vijaya.murari@campusx.edu' },
    { name: 'Dr. Puneeth R P',        email: 'puneeth.rp@campusx.edu' },
    { name: 'Ms. Aishwarya D Shetty', email: 'aishwarya.shetty@campusx.edu' },
    { name: 'Mr. Sreekiran Bhat',     email: 'sreekiran.bhat@campusx.edu' },
    { name: 'Ms. B Vijetha',          email: 'b.vijetha@campusx.edu' },
    { name: 'Ms. Anushree',           email: 'anushree@campusx.edu' },
    { name: 'Mr. Shubham Sarangi',    email: 'shubham.sarangi@campusx.edu' },
    { name: 'Mr. Prajwal Rao',        email: 'prajwal.rao@campusx.edu' },
    { name: 'Ms. Ankitha A Nayak',    email: 'ankitha.nayak@campusx.edu' },
    { name: 'Mr. Nagaraj K C',        email: 'nagaraj.kc@campusx.edu' },
    { name: 'Mr. Suvarnakumari',      email: 'suvarnakumari@campusx.edu' },
    { name: 'Ms. Rakshitha M Bhat',   email: 'rakshitha.bhat@campusx.edu' },
    { name: 'Mr. Dharshan',           email: 'dharshan@campusx.edu' },
    { name: 'Mr. Sunil Kumar Aithal', email: 'sunil.aithal@campusx.edu' },
    { name: 'Ms. Aishwarya D Shetty', email: 'aishwarya2.shetty@campusx.edu' },
  ];

  const { default: bcrypt } = await import('bcryptjs');
  const facultyPwd = await bcrypt.hash('Faculty@123', 12);
  const facultyIdMap: Record<string, string> = {}; // email → id

  for (const fd of facultyDefs) {
    let user = await prisma.user.findFirst({ where: { email: fd.email } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: fd.name, email: fd.email, password: facultyPwd, role: 'FACULTY' },
      });
    }
    facultyIdMap[fd.email] = user.id;
    // also index by name for convenience
    facultyIdMap[fd.name] = user.id;
  }

  // ── 6. Subjects ─────────────────────────────────────────────────────────────
  const subjectDefs = [
    { code: 'CS3002-1', name: 'Computer Graphics and Visualization', short: 'CG' },
    { code: 'CS3604-1', name: 'Mobile App Development Lab',          short: 'MAD' },
    { code: 'MG1002-1', name: 'Financial Management',                short: 'FM' },
    { code: 'HU1009-1', name: 'Indian Knowledge Systems',            short: 'IKS' },
    { code: 'CS3214-1', name: 'NoSQL Database',                      short: 'NDB' },
    { code: 'CS3232-1', name: 'Data Mining',                         short: 'DM' },
    { code: 'CS3301-1', name: 'Business Intelligence',               short: 'BI' },
    { code: 'CS3314-1', name: 'Software Testing',                    short: 'ST' },
    { code: 'CS3324-1', name: 'Embedded Secure Element',             short: 'ESE' },
    { code: 'OE',       name: 'Open Elective',                       short: 'OE' },
    { code: 'CS3606',   name: 'Advanced Backend Development',        short: 'ABD' },
  ];

  const subjectIdMap: Record<string, string> = {}; // code/short → id

  for (const sd of subjectDefs) {
    let subj = await prisma.subject.findFirst({ where: { code: sd.code } });
    if (!subj) {
      subj = await prisma.subject.create({
        data: {
          name: sd.name,
          code: sd.code,
          departmentId: cseDept.id,
          semester: 7,
          credits: sd.short.endsWith('Lab') ? 1 : 3,
        },
      });
    }
    subjectIdMap[sd.code]  = subj.id;
    subjectIdMap[sd.short] = subj.id;
    subjectIdMap[sd.name]  = subj.id;
  }

  // ── 7. Semester ─────────────────────────────────────────────────────────────
  let sem = await prisma.semester.findFirst({
    where: { academicYear: '2026-27', type: SemesterType.ODD },
  });
  if (!sem) {
    sem = await prisma.semester.create({
      data: {
        academicYear: '2026-27',
        type: SemesterType.ODD,
        startDate: new Date('2026-08-01'),
        endDate:   new Date('2026-12-31'),
        isActive:  true,
      },
    });
  }

  // ── 8. Classes (4 sections) ─────────────────────────────────────────────────
  const sections = [
    { section: 'A', strength: 60, advisor: 'Ms. Shilpa M K' },
    { section: 'B', strength: 60, advisor: 'Ms. Aishwarya D Shetty' },
    { section: 'C', strength: 60, advisor: 'Mr. Sreekiran Bhat' },
    { section: 'D', strength: 60, advisor: 'Mr. Prajwal Rao' },
  ];

  const classIdMap: Record<string, string> = {}; // section → classId

  for (const sc of sections) {
    let cls = await prisma.class.findFirst({
      where: {
        departmentId:    cseDept.id,
        semesterNumber:  7,
        section:         sc.section,
        semesterId:      sem.id,
      },
    });
    if (!cls) {
      cls = await prisma.class.create({
        data: {
          name:           `CSE Sem 7 - Section ${sc.section}`,
          departmentId:   cseDept.id,
          semesterNumber: 7,
          section:        sc.section,
          strength:       sc.strength,
          semesterId:     sem.id,
        },
      });
    }
    classIdMap[sc.section] = cls.id;
  }

  // ── 9. Timetable entries ────────────────────────────────────────────────────
  // Helper: upsert a timetable entry
  async function addEntry(
    section: string,
    day: DayOfWeek,
    period: number,
    subjectShort: string,
    facultyEmail: string,
    code: string,
  ) {
    const classId   = classIdMap[section];
    const subjectId = subjectIdMap[subjectShort];
    const facultyId = facultyIdMap[facultyEmail] ?? facultyIdMap[facultyEmail.replace('@campusx.edu', '')];
    const roomId    = roomIdMap[code];

    if (!subjectId) { console.warn(`  ⚠ subject not found: ${subjectShort}`); return; }
    if (!facultyId) { console.warn(`  ⚠ faculty not found: ${facultyEmail}`); return; }
    if (!roomId)    { console.warn(`  ⚠ room not found: ${code}`);             return; }

    const existing = await prisma.timetableEntry.findFirst({
      where: { classId, semesterId: sem!.id, day: day, period: period },
    });
    if (existing) return; // don't duplicate

    const { startTime, endTime } = periodTime(period);
    try {
      await prisma.timetableEntry.create({
        data: {
          classId,
          subjectId,
          facultyId,
          roomId,
          semesterId: sem!.id,
          day:        day,
          period:     period,
          startTime,
          endTime,
        },
      });
    } catch (e: any) {
      // P2002 = unique constraint violation (e.g. faculty teaching two sections at same time)
      if (e?.code === 'P2002') {
        console.warn(`  ⚠ Skipped (constraint): Sec ${section} ${day} P${period} ${subjectShort} – ${e.meta?.target}`);
      } else {
        throw e;
      }
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION A  (Class Advisor: Ms. Shilpa M K)
  // MON: MAD Lab(p1-2), OE(p3), BI/ST(p5), NDB/DM(p6)
  // TUE: CG@CS26(p1), FM@CS26(p2), OE(p3), BI/ST/ESE(p4), CG Lab(p5-6)
  // WED: CG@CS26(p2), OE(p3), NDB/DM(p4), ESE Lab(p5-6)
  // THU: CG@CS26(p1), NDB/DM(p2), FM@CS26(p3), BI/ST/ESE(p4), IKS@CS26(p5), CG@CS26(p6), FM@CS26(p7)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('  Adding Section A...');
  // MON
  await addEntry('A', 'MON', 1, 'MAD', 'shabari.shedthi@campusx.edu', 'CSL33');
  await addEntry('A', 'MON', 2, 'MAD', 'shabari.shedthi@campusx.edu', 'CSL33');
  await addEntry('A', 'MON', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('A', 'MON', 5, 'BI',  'sampath.kini@campusx.edu',    'CS26');
  await addEntry('A', 'MON', 6, 'NDB', 'minu.pa@campusx.edu',         'CS26');
  // TUE
  await addEntry('A', 'TUE', 1, 'CG',  'shilpa.mk@campusx.edu',       'CS26');
  await addEntry('A', 'TUE', 2, 'FM',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('A', 'TUE', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('A', 'TUE', 4, 'BI',  'sampath.kini@campusx.edu',    'CS26');
  await addEntry('A', 'TUE', 5, 'CG',  'shilpa.mk@campusx.edu',       'CSL35');
  await addEntry('A', 'TUE', 6, 'CG',  'shilpa.mk@campusx.edu',       'CSL35');
  // WED
  await addEntry('A', 'WED', 2, 'CG',  'shilpa.mk@campusx.edu',       'CS26');
  await addEntry('A', 'WED', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('A', 'WED', 4, 'NDB', 'minu.pa@campusx.edu',         'CS26');
  await addEntry('A', 'WED', 5, 'ESE', 'vijaya.murari@campusx.edu',   'CSL33');
  await addEntry('A', 'WED', 6, 'ESE', 'vijaya.murari@campusx.edu',   'CSL33');
  // THU
  await addEntry('A', 'THU', 1, 'CG',  'shilpa.mk@campusx.edu',       'CS26');
  await addEntry('A', 'THU', 2, 'NDB', 'minu.pa@campusx.edu',         'CS26');
  await addEntry('A', 'THU', 3, 'FM',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('A', 'THU', 4, 'BI',  'sampath.kini@campusx.edu',    'CS26');
  await addEntry('A', 'THU', 5, 'IKS', 'basavangouda@campusx.edu',    'CS26');
  await addEntry('A', 'THU', 6, 'CG',  'shilpa.mk@campusx.edu',       'CS26');
  await addEntry('A', 'THU', 7, 'FM',  'keerthan.dixit@campusx.edu',  'CS26');

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION B  (Class Advisor: Ms. Aishwarya D Shetty)
  // MON: CG Lab(p1-2), OE(p3), BI/ST(p5), NDB/DM(p6), FM@CS26(p7)
  // TUE: CG@CS12(p2), OE(p3), BI/ST/ESE(p4), MAD Lab(p5-6)
  // WED: CG@CS13(p1), FM@CS13(p2), OE(p3), NDB/DM(p4), ESE Lab(p5-6)
  // THU: NDB/DM(p2), CG@CS25(p3), BI/ST/ESE(p4), FM@CS21(p5), CG@CS21(p6), IKS@CS21(p7)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('  Adding Section B...');
  // MON
  await addEntry('B', 'MON', 1, 'CG',  'puneeth.rp@campusx.edu',      'CSL35');
  await addEntry('B', 'MON', 2, 'CG',  'puneeth.rp@campusx.edu',      'CSL35');
  await addEntry('B', 'MON', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS21');
  await addEntry('B', 'MON', 5, 'BI',  'sampath.kini@campusx.edu',    'CS21');
  await addEntry('B', 'MON', 6, 'NDB', 'minu.pa@campusx.edu',         'CS21');
  await addEntry('B', 'MON', 7, 'FM',  'keerthan.dixit@campusx.edu',  'CS26');
  // TUE
  await addEntry('B', 'TUE', 2, 'CG',  'puneeth.rp@campusx.edu',      'CS12');
  await addEntry('B', 'TUE', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS12');
  await addEntry('B', 'TUE', 4, 'BI',  'sampath.kini@campusx.edu',    'CS12');
  await addEntry('B', 'TUE', 5, 'MAD', 'aishwarya.shetty@campusx.edu','CSL33');
  await addEntry('B', 'TUE', 6, 'MAD', 'aishwarya.shetty@campusx.edu','CSL33');
  // WED
  await addEntry('B', 'WED', 1, 'CG',  'puneeth.rp@campusx.edu',      'CS13');
  await addEntry('B', 'WED', 2, 'FM',  'keerthan.dixit@campusx.edu',  'CS13');
  await addEntry('B', 'WED', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS13');
  await addEntry('B', 'WED', 4, 'NDB', 'minu.pa@campusx.edu',         'CS13');
  await addEntry('B', 'WED', 5, 'ESE', 'vijaya.murari@campusx.edu',   'CSL33');
  await addEntry('B', 'WED', 6, 'ESE', 'vijaya.murari@campusx.edu',   'CSL33');
  // THU
  await addEntry('B', 'THU', 2, 'NDB', 'minu.pa@campusx.edu',         'CS25');
  await addEntry('B', 'THU', 3, 'CG',  'puneeth.rp@campusx.edu',      'CS25');
  await addEntry('B', 'THU', 4, 'BI',  'sampath.kini@campusx.edu',    'CS25');
  await addEntry('B', 'THU', 5, 'FM',  'keerthan.dixit@campusx.edu',  'CS21');
  await addEntry('B', 'THU', 6, 'CG',  'puneeth.rp@campusx.edu',      'CS21');
  await addEntry('B', 'THU', 7, 'IKS', 'nagaraj.kc@campusx.edu',      'CS21');

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION C  (Class Advisor: Mr. Sreekiran Bhat)
  // MON: FM@CS26(p1), CG@CS26(p2), OE(p3), BI/ST(p5), NDB/DM(p6)
  // TUE: CG@CS15(p2), OE(p3), BI/ST/ESE(p4), IKS@CS26(p5), CG@CS26(p6), FM@CS26(p7)
  // WED: MAD Lab(p1-2), OE(p3), NDB/DM(p4), ESE Lab(p5-6)
  // THU: FM@CS24(p1), NDB/DM(p2), CG@CSL45(p3), BI/ST/ESE(p4), CG Lab(p5-6)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('  Adding Section C...');
  // MON
  await addEntry('C', 'MON', 1, 'FM',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('C', 'MON', 2, 'CG',  'sreekiran.bhat@campusx.edu',  'CS26');
  await addEntry('C', 'MON', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('C', 'MON', 5, 'BI',  'sampath.kini@campusx.edu',    'CS26');
  await addEntry('C', 'MON', 6, 'NDB', 'minu.pa@campusx.edu',         'CS26');
  // TUE
  await addEntry('C', 'TUE', 2, 'CG',  'sreekiran.bhat@campusx.edu',  'CS15');
  await addEntry('C', 'TUE', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS15');
  await addEntry('C', 'TUE', 4, 'BI',  'sampath.kini@campusx.edu',    'CS15');
  await addEntry('C', 'TUE', 5, 'IKS', 'anushree@campusx.edu',        'CS26');
  await addEntry('C', 'TUE', 6, 'CG',  'sreekiran.bhat@campusx.edu',  'CS26');
  await addEntry('C', 'TUE', 7, 'FM',  'keerthan.dixit@campusx.edu',  'CS26');
  // WED
  await addEntry('C', 'WED', 1, 'MAD', 'b.vijetha@campusx.edu',       'CSL33');
  await addEntry('C', 'WED', 2, 'MAD', 'b.vijetha@campusx.edu',       'CSL33');
  await addEntry('C', 'WED', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('C', 'WED', 4, 'NDB', 'minu.pa@campusx.edu',         'CS26');
  await addEntry('C', 'WED', 5, 'ESE', 'vijaya.murari@campusx.edu',   'CSL33');
  await addEntry('C', 'WED', 6, 'ESE', 'vijaya.murari@campusx.edu',   'CSL33');
  // THU
  await addEntry('C', 'THU', 1, 'FM',  'keerthan.dixit@campusx.edu',  'CS24');
  await addEntry('C', 'THU', 2, 'NDB', 'minu.pa@campusx.edu',         'CS24');
  await addEntry('C', 'THU', 3, 'CG',  'sreekiran.bhat@campusx.edu',  'CSL45');
  await addEntry('C', 'THU', 4, 'BI',  'sampath.kini@campusx.edu',    'CSL45');
  await addEntry('C', 'THU', 5, 'CG',  'sreekiran.bhat@campusx.edu',  'CSL35');
  await addEntry('C', 'THU', 6, 'CG',  'sreekiran.bhat@campusx.edu',  'CSL35');

  // ────────────────────────────────────────────────────────────────────────────
  // SECTION D  (Class Advisor: Mr. Prajwal Rao)
  // MON: FM@CS14(p2), OE(p3), BI/ST(p5), NDB/DM(p6)
  // TUE: CG@CSL45(p2), OE(p3), BI/ST/ESE(p4), FM@CS16(p5), CG@CS16(p6)
  // WED: CG Lab(p1-2), OE(p3), NDB/DM(p4), ESE Lab(p5-6)
  // THU: NDB/DM(p2), CG@CSL35(p3), BI/ST/ESE(p4), MAD Lab(p5-6)
  // FRI: FM@CS26(p1), ABD@CS26(p2), ABD Lab(p3-4), CG@CS26(p5), IKS@CS26(p6)
  // ────────────────────────────────────────────────────────────────────────────
  console.log('  Adding Section D...');
  // MON
  await addEntry('D', 'MON', 2, 'FM',  'keerthan.dixit@campusx.edu',  'CS14');
  await addEntry('D', 'MON', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS14');
  await addEntry('D', 'MON', 5, 'BI',  'sampath.kini@campusx.edu',    'CS14');
  await addEntry('D', 'MON', 6, 'NDB', 'minu.pa@campusx.edu',         'CS14');
  // TUE
  await addEntry('D', 'TUE', 2, 'CG',  'prajwal.rao@campusx.edu',     'CSL45');
  await addEntry('D', 'TUE', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CSL45');
  await addEntry('D', 'TUE', 4, 'BI',  'sampath.kini@campusx.edu',    'CSL45');
  await addEntry('D', 'TUE', 5, 'FM',  'keerthan.dixit@campusx.edu',  'CS16');
  await addEntry('D', 'TUE', 6, 'CG',  'prajwal.rao@campusx.edu',     'CS16');
  // WED
  await addEntry('D', 'WED', 1, 'CG',  'prajwal.rao@campusx.edu',     'CSL35');
  await addEntry('D', 'WED', 2, 'CG',  'prajwal.rao@campusx.edu',     'CSL35');
  await addEntry('D', 'WED', 3, 'OE',  'keerthan.dixit@campusx.edu',  'CS16');
  await addEntry('D', 'WED', 4, 'NDB', 'minu.pa@campusx.edu',         'CS16');
  await addEntry('D', 'WED', 5, 'ESE', 'vijaya.murari@campusx.edu',   'CSL33');
  await addEntry('D', 'WED', 6, 'ESE', 'vijaya.murari@campusx.edu',   'CSL33');
  // THU
  await addEntry('D', 'THU', 2, 'NDB', 'minu.pa@campusx.edu',         'CS16');
  await addEntry('D', 'THU', 3, 'CG',  'prajwal.rao@campusx.edu',     'CSL35');
  await addEntry('D', 'THU', 4, 'BI',  'sampath.kini@campusx.edu',    'CSL35');
  await addEntry('D', 'THU', 5, 'MAD', 'shabari.shedthi@campusx.edu', 'CSL33');
  await addEntry('D', 'THU', 6, 'MAD', 'shabari.shedthi@campusx.edu', 'CSL33');
  // FRI
  await addEntry('D', 'FRI', 1, 'FM',  'keerthan.dixit@campusx.edu',  'CS26');
  await addEntry('D', 'FRI', 2, 'ABD', 'dharshan@campusx.edu',        'CS26');
  await addEntry('D', 'FRI', 3, 'ABD', 'dharshan@campusx.edu',        'CSL33');
  await addEntry('D', 'FRI', 4, 'ABD', 'dharshan@campusx.edu',        'CSL33');
  await addEntry('D', 'FRI', 5, 'CG',  'prajwal.rao@campusx.edu',     'CS26');
  await addEntry('D', 'FRI', 6, 'IKS', 'suvarnakumari@campusx.edu',   'CS26');

  const count = await prisma.timetableEntry.count({ where: { semesterId: sem.id } });
  console.log(`✅ Total timetable entries for 2026-27 Odd: ${count}`);
  console.log('🎉 7th Semester seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());


