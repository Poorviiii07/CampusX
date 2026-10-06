/**
 * Seed script: Real 5th Semester Timetable (CSE, 2026-27 Odd)
 * Sections A, B, C, D, E
 *
 * Room naming:
 *   CS<floor><room>  e.g. CS21 = Floor 2, Room 1  (assigned room numbers from PDF)
 *   CSL<floor><room> e.g. CSL47 = Floor 4, Lab 7
 *
 * Section base rooms: A=21, B=22, C=23, D=24, E=25
 * (first digit = floor, so rooms 21-25 are all floor 2)
 *
 * Time slots (8 periods):
 *   1: 09:00-09:55  2: 09:55-10:50  [break]
 *   3: 11:10-12:05  4: 12:05-13:00  [lunch]
 *   5: 13:55-14:50  6: 14:50-15:40  7: 15:40-16:30
 */

import { PrismaClient, RoomType, DayOfWeek, SemesterType } from '@prisma/client';
const prisma = new PrismaClient();

function pt(p: number) {
  const s: Record<number,[string,string]> = {
    1:['09:00','09:55'], 2:['09:55','10:50'], 3:['11:10','12:05'],
    4:['12:05','13:00'], 5:['13:55','14:50'], 6:['14:50','15:40'], 7:['15:40','16:30'],
  };
  const [startTime,endTime]=s[p]??['00:00','00:00'];
  return { startTime, endTime };
}

function floorFrom(code: string): number {
  const m = code.match(/^CSL?(\d)/);
  return m ? parseInt(m[1],10) : 2;
}

async function main() {
  console.log('🌱 Seeding 5th Semester timetable (Sections A-E)...');

  const cseDept = await prisma.department.findFirstOrThrow({ where: { code: 'CSE' } });
  const cseBuilding = await prisma.building.findFirstOrThrow({ where: { code: 'CSE' } });

  // Ensure floors 1-4
  const floorMap: Record<number,string> = {};
  for (let n=1;n<=4;n++) {
    let f = await prisma.floor.findFirst({ where:{ buildingId:cseBuilding.id, floorNumber:n } });
    if (!f) f = await prisma.floor.create({ data:{ floorNumber:n, name:`CSE Block - Floor ${n}`, buildingId:cseBuilding.id } });
    floorMap[n] = f.id;
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  // Section base rooms (floor 2): CS21..CS25
  // Labs: CSL33, CSL35, CSL36, CSL37, CSL41, CSL42, CSL43, CSL46, CSL47
  const roomDefs = [
    // Floor 2 classrooms (section base rooms)
    { code:'CS21', name:'Classroom 21', type:'CLASSROOM' as RoomType, cap:65, lab:false },
    { code:'CS22', name:'Classroom 22', type:'CLASSROOM' as RoomType, cap:65, lab:false },
    { code:'CS23', name:'Classroom 23', type:'CLASSROOM' as RoomType, cap:65, lab:false },
    { code:'CS24', name:'Classroom 24', type:'CLASSROOM' as RoomType, cap:65, lab:false },
    { code:'CS25', name:'Classroom 25', type:'CLASSROOM' as RoomType, cap:65, lab:false },
    // Floor 3 labs
    { code:'CSL33', name:'Computer Lab 33', type:'LAB' as RoomType, cap:40, lab:true },
    { code:'CSL35', name:'Computer Lab 35', type:'LAB' as RoomType, cap:40, lab:true },
    { code:'CSL36', name:'Computer Lab 36', type:'LAB' as RoomType, cap:40, lab:true },
    { code:'CSL37', name:'Computer Lab 37', type:'LAB' as RoomType, cap:40, lab:true },
    { code:'CSL41', name:'Computer Lab 41', type:'LAB' as RoomType, cap:40, lab:true },
    { code:'CSL42', name:'Computer Lab 42', type:'LAB' as RoomType, cap:40, lab:true },
    { code:'CSL43', name:'Computer Lab 43', type:'LAB' as RoomType, cap:40, lab:true },
    { code:'CSL46', name:'Computer Lab 46 (OS Lab)', type:'LAB' as RoomType, cap:40, lab:true },
    { code:'CSL47', name:'Computer Lab 47 (CNC Lab)', type:'LAB' as RoomType, cap:40, lab:true },
  ];

  const roomIdMap: Record<string,string> = {};
  for (const rd of roomDefs) {
    const fn = floorFrom(rd.code);
    const fid = floorMap[fn];
    let room = await prisma.room.findFirst({ where:{ code:rd.code } });
    if (!room) {
      room = await prisma.room.create({ data:{
        code:rd.code, name:rd.name, type:rd.type, capacity:rd.cap,
        floor:fn, floorId:fid, buildingId:cseBuilding.id, department:'CSE',
        equipment:rd.lab?JSON.stringify(['Projector','Computers','40 PCs']):JSON.stringify(['Projector']),
        status:'AVAILABLE', isActive:true,
      }});
      console.log(`  + room ${rd.code}`);
    }
    roomIdMap[rd.code] = room.id;
  }

  // ── Faculty ────────────────────────────────────────────────────────────────
  const { default: bcrypt } = await import('bcryptjs');
  const pwd = await bcrypt.hash('Faculty@123',12);
  const fDefs = [
    { name:'Ms. Vijetha B',              email:'vijetha.b@campusx.edu' },
    { name:'Dr. Savitha Shetty',         email:'savitha.shetty@campusx.edu' },
    { name:'Ms. Sowmya Ashwath',         email:'sowmya.ashwath@campusx.edu' },
    { name:'Ms. Ankitha A Nayak',        email:'ankitha.nayak@campusx.edu' },
    { name:'Mr. Sunil Kumar Aithal',     email:'sunil.aithal@campusx.edu' },
    { name:'Mr. Keerthi Shetty',         email:'keerthi.shetty@campusx.edu' },
    { name:'Ms. Prathwini',              email:'prathwini@campusx.edu' },
    { name:'Ms. Simran Banu',            email:'simran.banu@campusx.edu' },
    { name:'Dr. Ganesh Aithal',          email:'ganesh.aithal@campusx.edu' },
    { name:'Ms. Sadiya Mubarak',         email:'sadiya.mubarak@campusx.edu' },
    { name:'Mr. Guruprasad',             email:'guruprasad@campusx.edu' },
    { name:'Mr. Suhail Ahmed Nisar Saha',email:'suhail.saha@campusx.edu' },
    { name:'Mr. Sreekiran Bhat',         email:'sreekiran.bhat@campusx.edu' },
    { name:'Dr. Sannidhan M S',          email:'sannidhan.ms@campusx.edu' },
    { name:'Dr. Jyothi Shetty',          email:'jyothi.shetty@campusx.edu' },
    { name:'Dr. Asmitha Poojari',        email:'asmitha.poojari@campusx.edu' },
    { name:'Dr. D K Sreekantha',         email:'dk.sreekantha@campusx.edu' },
    { name:'Dr. Sudeepa K B',            email:'sudeepa.kb@campusx.edu' },
    { name:'Dr. Raghunandan K R',        email:'raghunandan.kr@campusx.edu' },
    { name:'Ms. Manasa G R',             email:'manasa.gr@campusx.edu' },
    { name:'Dr. Keerthana B C',          email:'keerthana.bc@campusx.edu' },
    { name:'Ms. Shabhana',               email:'shabhana@campusx.edu' },
    { name:'Dr. Pallavi K N',            email:'pallavi.kn@campusx.edu' },
    { name:'Dr. Rajalaxmi S Hegde',      email:'rajalaxmi.hegde@campusx.edu' },
    { name:'Ms. Jayapadmini Kanchan',    email:'jayapadmini.kanchan@campusx.edu' },
    { name:'Dr. Dhasny L M',             email:'dhasny.lm@campusx.edu' },
    { name:'Ms. Anupama H C',            email:'anupama.hc@campusx.edu' },
    { name:'Mr. Sachin Shetty',          email:'sachin.shetty@campusx.edu' },
    { name:'Ms. Sowmya P',               email:'sowmya.p@campusx.edu' },
    { name:'Mr. Dharshan',               email:'dharshan@campusx.edu' },
    { name:'Mr. Akhilraj V Gadagkar',    email:'akhilraj.gadagkar@campusx.edu' },
    { name:'Mr. Prithviraj Jain',        email:'prithviraj.jain@campusx.edu' },
    { name:'Dr. Vijaya Murari T',        email:'vijaya.murari@campusx.edu' },
  ];
  const fMap: Record<string,string> = {};
  for (const fd of fDefs) {
    let u = await prisma.user.findFirst({ where:{ email:fd.email } });
    if (!u) u = await prisma.user.create({ data:{ name:fd.name, email:fd.email, password:pwd, role:'FACULTY' } });
    fMap[fd.email] = u.id;
    fMap[fd.name]  = u.id;
  }

  // ── Subjects ───────────────────────────────────────────────────────────────
  const subjDefs = [
    { code:'CS3001-1', name:'Computer Network and Communication', short:'CNC' },
    { code:'CS2004-1', name:'Operating Systems',                  short:'OS'  },
    { code:'CS3103-1', name:'Theory of Computation',              short:'TOC' },
    { code:'CS3603-1', name:'Java and Spring Framework Lab',      short:'JSF' },
    { code:'CS1231-1', name:'Introduction to Data Science',       short:'IDS' },
    { code:'CS3222-1', name:'Cryptography and Network Security',  short:'CNS' },
    { code:'HU1006-1', name:'Introduction to IPR',                short:'IPR' },
    { code:'HU1011-1', name:'Universal Human Values',             short:'UHV' },
    { code:'CS3651-1', name:'Programming with C++',               short:'PC++'},
    { code:'HU1007-1', name:'Social Connect and Responsibility',  short:'SCR' },
    { code:'UM1003-1', name:'Employability Skill Development',    short:'ESD' },
    { code:'CS2607-1', name:'Agile and Extreme Programming',      short:'AEP' },
  ];
  const sMap: Record<string,string> = {};
  for (const sd of subjDefs) {
    let s = await prisma.subject.findFirst({ where:{ code:sd.code } });
    if (!s) s = await prisma.subject.create({ data:{ name:sd.name, code:sd.code, departmentId:cseDept.id, semester:5, credits:3 } });
    sMap[sd.code]=s.id; sMap[sd.short]=s.id; sMap[sd.name]=s.id;
  }

  // ── Semester ───────────────────────────────────────────────────────────────
  let sem = await prisma.semester.findFirst({ where:{ academicYear:'2026-27', type:SemesterType.ODD } });
  if (!sem) sem = await prisma.semester.create({ data:{ academicYear:'2026-27', type:SemesterType.ODD, startDate:new Date('2026-08-01'), endDate:new Date('2026-12-31'), isActive:true } });

  // ── Classes ────────────────────────────────────────────────────────────────
  const sections5 = [
    { section:'A', strength:65, room:'CS21' },
    { section:'B', strength:65, room:'CS22' },
    { section:'C', strength:65, room:'CS23' },
    { section:'D', strength:65, room:'CS24' },
    { section:'E', strength:65, room:'CS25' },
  ];
  const clsMap: Record<string,string> = {};
  for (const sc of sections5) {
    let cls = await prisma.class.findFirst({ where:{ departmentId:cseDept.id, semesterNumber:5, section:sc.section, semesterId:sem.id } });
    if (!cls) cls = await prisma.class.create({ data:{ name: `CSE Sem 5 - Section ${sc.section}`, departmentId:cseDept.id, semesterNumber:5, section:sc.section, strength:sc.strength, semesterId:sem.id } });
    clsMap[sc.section] = cls.id;
  }

  // ── Helper ─────────────────────────────────────────────────────────────────
  async function add(sec:string, day:DayOfWeek, period:number, subj:string, fac:string, room:string) {
    const classId=clsMap[sec], subjectId=sMap[subj], facultyId=fMap[fac], roomId=roomIdMap[room];
    if (!subjectId){console.warn(`  ⚠ subj not found: ${subj}`);return;}
    if (!facultyId){console.warn(`  ⚠ fac not found: ${fac}`);return;}
    if (!roomId)   {console.warn(`  ⚠ room not found: ${room}`);return;}
    const ex = await prisma.timetableEntry.findFirst({ where:{ classId, semesterId:sem!.id, day:day, period:period } });
    if (ex) return;
    const { startTime, endTime } = pt(period);
    try {
      await prisma.timetableEntry.create({ data:{ classId, subjectId, facultyId, roomId, semesterId:sem!.id, day:day, period:period, startTime, endTime } });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        console.warn(`  ⚠ Skipped (constraint): Sec ${sec} ${day} P${period} ${subj} – ${e.meta?.target}`);
      } else {
        throw e;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION A (Room 21, Advisor: Dr. Savitha Shetty)
  // MON: OS(1) TOC(2) CNC(3) CNS(4)
  // TUE: CNC(1) CNS(2) CNC Lab A1(3-4) TOC(5) CNC(6) UHV(7)
  // WED: TOC(1) OS(2) UHV(3) CNC(4) JSF Lab(5-6)
  // THU: ESD(1) IPR(2) TOC(3) SCR(4) CNC Lab A2(5-6)
  // FRI: OS(1) UHV(2) PC++(3) CNS(4) PC++ Lab(5-6)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('  5A...');
  await add('A','MON',1,'OS',  'savitha.shetty@campusx.edu','CS21');
  await add('A','MON',2,'TOC', 'sowmya.ashwath@campusx.edu','CS21');
  await add('A','MON',3,'CNC', 'vijetha.b@campusx.edu',     'CS21');
  await add('A','MON',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS21');
  await add('A','TUE',1,'CNC', 'vijetha.b@campusx.edu',     'CS21');
  await add('A','TUE',2,'CNS', 'ganesh.aithal@campusx.edu', 'CS21');
  await add('A','TUE',3,'CNC', 'vijetha.b@campusx.edu',     'CSL47');
  await add('A','TUE',4,'CNC', 'vijetha.b@campusx.edu',     'CSL47');
  await add('A','TUE',5,'TOC', 'sowmya.ashwath@campusx.edu','CS21');
  await add('A','TUE',6,'CNC', 'vijetha.b@campusx.edu',     'CS21');
  await add('A','TUE',7,'UHV', 'sadiya.mubarak@campusx.edu','CS21');
  await add('A','WED',1,'TOC', 'sowmya.ashwath@campusx.edu','CS21');
  await add('A','WED',2,'OS',  'savitha.shetty@campusx.edu','CS21');
  await add('A','WED',3,'UHV', 'sadiya.mubarak@campusx.edu','CS21');
  await add('A','WED',4,'CNC', 'vijetha.b@campusx.edu',     'CS21');
  await add('A','WED',5,'JSF', 'ankitha.nayak@campusx.edu', 'CSL33');
  await add('A','WED',6,'JSF', 'ankitha.nayak@campusx.edu', 'CSL33');
  await add('A','THU',1,'ESD', 'sreekiran.bhat@campusx.edu','CS21');
  await add('A','THU',2,'IPR', 'sadiya.mubarak@campusx.edu','CS21');
  await add('A','THU',3,'TOC', 'sowmya.ashwath@campusx.edu','CS21');
  await add('A','THU',4,'SCR', 'suhail.saha@campusx.edu',   'CS21');
  await add('A','THU',5,'CNC', 'vijetha.b@campusx.edu',     'CSL46');
  await add('A','THU',6,'CNC', 'vijetha.b@campusx.edu',     'CSL46');
  await add('A','FRI',1,'OS',  'savitha.shetty@campusx.edu','CS21');
  await add('A','FRI',2,'UHV', 'sadiya.mubarak@campusx.edu','CS21');
  await add('A','FRI',3,'PC++','guruprasad@campusx.edu',     'CS21');
  await add('A','FRI',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS21');
  await add('A','FRI',5,'PC++','guruprasad@campusx.edu',     'CSL35');
  await add('A','FRI',6,'PC++','guruprasad@campusx.edu',     'CSL35');

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION B (Room 22, Advisor: Ms. Sadiya Mubarak)
  // MON: CNC(1) TOC(2) PC++(3) CNS(4) PC++ Lab(5-6)
  // TUE: TOC(1) CNS(2) OS(3) UHV(4) CNC Lab B1(5-6)
  // WED: ESD(1) SCR(2) CNC Lab B2(3-4) IPR(5) CNC(6) UHV(7)
  // THU: UHV(1) TOC(2) CNC(3) OS(4) JSF Lab(5-6)
  // FRI: CNC(1) OS(2) TOC(3) CNS(4)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('  5B...');
  await add('B','MON',1,'CNC', 'guruprasad@campusx.edu',    'CS22');
  await add('B','MON',2,'TOC', 'jyothi.shetty@campusx.edu', 'CS22');
  await add('B','MON',3,'PC++','asmitha.poojari@campusx.edu','CS22');
  await add('B','MON',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS22');
  await add('B','MON',5,'PC++','asmitha.poojari@campusx.edu','CSL35');
  await add('B','MON',6,'PC++','asmitha.poojari@campusx.edu','CSL35');
  await add('B','TUE',1,'TOC', 'jyothi.shetty@campusx.edu', 'CS22');
  await add('B','TUE',2,'CNS', 'ganesh.aithal@campusx.edu', 'CS22');
  await add('B','TUE',3,'OS',  'sannidhan.ms@campusx.edu',  'CS22');
  await add('B','TUE',4,'UHV', 'dk.sreekantha@campusx.edu', 'CS22');
  await add('B','TUE',5,'CNC', 'guruprasad@campusx.edu',    'CSL47');
  await add('B','TUE',6,'CNC', 'guruprasad@campusx.edu',    'CSL47');
  await add('B','WED',1,'ESD', 'sreekiran.bhat@campusx.edu','CS22');
  await add('B','WED',2,'SCR', 'suhail.saha@campusx.edu',   'CS22');
  await add('B','WED',3,'CNC', 'guruprasad@campusx.edu',    'CSL47');
  await add('B','WED',4,'CNC', 'guruprasad@campusx.edu',    'CSL47');
  await add('B','WED',5,'IPR', 'sadiya.mubarak@campusx.edu','CS22');
  await add('B','WED',6,'CNC', 'guruprasad@campusx.edu',    'CS22');
  await add('B','WED',7,'UHV', 'dk.sreekantha@campusx.edu', 'CS22');
  await add('B','THU',1,'UHV', 'dk.sreekantha@campusx.edu', 'CS22');
  await add('B','THU',2,'TOC', 'jyothi.shetty@campusx.edu', 'CS22');
  await add('B','THU',3,'CNC', 'guruprasad@campusx.edu',    'CS22');
  await add('B','THU',4,'OS',  'sannidhan.ms@campusx.edu',  'CS22');
  await add('B','THU',5,'JSF', 'akhilraj.gadagkar@campusx.edu','CSL43');
  await add('B','THU',6,'JSF', 'akhilraj.gadagkar@campusx.edu','CSL43');
  await add('B','FRI',1,'CNC', 'guruprasad@campusx.edu',    'CS22');
  await add('B','FRI',2,'OS',  'sannidhan.ms@campusx.edu',  'CS22');
  await add('B','FRI',3,'TOC', 'jyothi.shetty@campusx.edu', 'CS22');
  await add('B','FRI',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS22');

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION C (Room 23, Advisor: Dr. Keerthana B C)
  // MON: TOC(1) CNC(2) OS(3) CNS(4) CNC Lab C1(5-6)
  // TUE: UHV(1) CNS(2) CNC Lab C2(3-4) IPR(5) CNC(6) TOC(7)
  // WED: CNC(1) TOC(2) PC++(3) OS(4) PC++ Lab(5-6)
  // THU: OS(1) CNC(2) TOC(3) UHV(4)
  // FRI: ESD(1) SCR(2) UHV(3) CNS(4) JSF Lab(5-6)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('  5C...');
  await add('C','MON',1,'TOC', 'keerthana.bc@campusx.edu',  'CS23');
  await add('C','MON',2,'CNC', 'raghunandan.kr@campusx.edu','CS23');
  await add('C','MON',3,'OS',  'manasa.gr@campusx.edu',     'CS23');
  await add('C','MON',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS23');
  await add('C','MON',5,'CNC', 'raghunandan.kr@campusx.edu','CSL47');
  await add('C','MON',6,'CNC', 'raghunandan.kr@campusx.edu','CSL47');
  await add('C','TUE',1,'UHV', 'sadiya.mubarak@campusx.edu','CS23');
  await add('C','TUE',2,'CNS', 'ganesh.aithal@campusx.edu', 'CS23');
  await add('C','TUE',3,'CNC', 'raghunandan.kr@campusx.edu','CSL41');
  await add('C','TUE',4,'CNC', 'raghunandan.kr@campusx.edu','CSL41');
  await add('C','TUE',5,'IPR', 'shabhana@campusx.edu',      'CS23');
  await add('C','TUE',6,'CNC', 'raghunandan.kr@campusx.edu','CS23');
  await add('C','TUE',7,'TOC', 'keerthana.bc@campusx.edu',  'CS23');
  await add('C','WED',1,'CNC', 'raghunandan.kr@campusx.edu','CS23');
  await add('C','WED',2,'TOC', 'keerthana.bc@campusx.edu',  'CS23');
  await add('C','WED',3,'PC++','prithviraj.jain@campusx.edu','CS23');
  await add('C','WED',4,'OS',  'manasa.gr@campusx.edu',     'CS23');
  await add('C','WED',5,'PC++','prithviraj.jain@campusx.edu','CSL35');
  await add('C','WED',6,'PC++','prithviraj.jain@campusx.edu','CSL35');
  await add('C','THU',1,'OS',  'manasa.gr@campusx.edu',     'CS23');
  await add('C','THU',2,'CNC', 'raghunandan.kr@campusx.edu','CS23');
  await add('C','THU',3,'TOC', 'keerthana.bc@campusx.edu',  'CS23');
  await add('C','THU',4,'UHV', 'sadiya.mubarak@campusx.edu','CS23');
  await add('C','FRI',1,'ESD', 'sreekiran.bhat@campusx.edu','CS23');
  await add('C','FRI',2,'SCR', 'simran.banu@campusx.edu',   'CS23');
  await add('C','FRI',3,'UHV', 'sadiya.mubarak@campusx.edu','CS23');
  await add('C','FRI',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS23');
  await add('C','FRI',5,'JSF', 'akhilraj.gadagkar@campusx.edu','CSL33');
  await add('C','FRI',6,'JSF', 'akhilraj.gadagkar@campusx.edu','CSL33');

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION D (Room 24, Advisor: Ms. Shabhana)
  // MON: CNC(1) OS(2) TOC(3) CNS(4) UHV(5) SCR(6)
  // TUE: PC++(1) CNS(2) PC++ Lab(3-4) OS(5) CNC(6) UHV(7)
  // WED: CNC(1) TOC(2) CNC Lab D1(3-4)
  // THU: JSF Lab(1-2) OS(3) IPR(4) ESD(5) TOC(6)
  // FRI: TOC(1) CNC(2) UHV(3) CNS(4) CNC Lab D2(5-6)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('  5D...');
  await add('D','MON',1,'CNC', 'vijaya.murari@campusx.edu', 'CS24');
  await add('D','MON',2,'OS',  'sowmya.p@campusx.edu',      'CS24');
  await add('D','MON',3,'TOC', 'pallavi.kn@campusx.edu',    'CS24');
  await add('D','MON',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS24');
  await add('D','MON',5,'UHV', 'dk.sreekantha@campusx.edu', 'CS24');
  await add('D','MON',6,'SCR', 'suhail.saha@campusx.edu',   'CS24');
  await add('D','TUE',1,'PC++','rajalaxmi.hegde@campusx.edu','CS24');
  await add('D','TUE',2,'CNS', 'ganesh.aithal@campusx.edu', 'CS24');
  await add('D','TUE',3,'PC++','rajalaxmi.hegde@campusx.edu','CSL35');
  await add('D','TUE',4,'PC++','rajalaxmi.hegde@campusx.edu','CSL35');
  await add('D','TUE',5,'OS',  'sowmya.p@campusx.edu',      'CS24');
  await add('D','TUE',6,'CNC', 'vijaya.murari@campusx.edu', 'CS24');
  await add('D','TUE',7,'UHV', 'dk.sreekantha@campusx.edu', 'CS24');
  await add('D','WED',1,'CNC', 'vijaya.murari@campusx.edu', 'CS24');
  await add('D','WED',2,'TOC', 'pallavi.kn@campusx.edu',    'CS24');
  await add('D','WED',3,'CNC', 'vijaya.murari@campusx.edu', 'CSL41');
  await add('D','WED',4,'CNC', 'vijaya.murari@campusx.edu', 'CSL41');
  await add('D','THU',1,'JSF', 'ankitha.nayak@campusx.edu', 'CSL33');
  await add('D','THU',2,'JSF', 'ankitha.nayak@campusx.edu', 'CSL33');
  await add('D','THU',3,'OS',  'sowmya.p@campusx.edu',      'CS24');
  await add('D','THU',4,'IPR', 'shabhana@campusx.edu',      'CS24');
  await add('D','THU',5,'ESD', 'shabhana@campusx.edu',      'CS24');
  await add('D','THU',6,'TOC', 'pallavi.kn@campusx.edu',    'CS24');
  await add('D','FRI',1,'TOC', 'pallavi.kn@campusx.edu',    'CS24');
  await add('D','FRI',2,'CNC', 'vijaya.murari@campusx.edu', 'CS24');
  await add('D','FRI',3,'UHV', 'dk.sreekantha@campusx.edu', 'CS24');
  await add('D','FRI',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS24');
  await add('D','FRI',5,'CNC', 'vijaya.murari@campusx.edu', 'CSL47');
  await add('D','FRI',6,'CNC', 'vijaya.murari@campusx.edu', 'CSL47');

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION E (Room 25, Advisor: Ms. Anupama H C)
  // MON: OS(1) CNC(2) TOC(3) CNS(4) AEP Lab(5-6)
  // TUE: IPR(1) CNS(2) JSF Lab(3-4) CNC(5) PC++(6) TOC(7)
  // WED: CNC(1) TOC(2) UHV(3) OS(4) CNC Lab E1(5-6)
  // THU: TOC(1) SCR(2) CNC Lab E2(3-4) UHV(5) OS(6) AEP(7)
  // FRI: CNC(1) UHV(2) ESD(3) CNS(4) PC++ Lab(5-6)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('  5E...');
  await add('E','MON',1,'OS',  'dhasny.lm@campusx.edu',     'CS25');
  await add('E','MON',2,'CNC', 'jayapadmini.kanchan@campusx.edu','CS25');
  await add('E','MON',3,'TOC', 'anupama.hc@campusx.edu',    'CS25');
  await add('E','MON',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS25');
  await add('E','MON',5,'AEP', 'dharshan@campusx.edu',      'CSL33');
  await add('E','MON',6,'AEP', 'dharshan@campusx.edu',      'CSL33');
  await add('E','TUE',1,'IPR', 'shabhana@campusx.edu',      'CS25');
  await add('E','TUE',2,'CNS', 'ganesh.aithal@campusx.edu', 'CS25');
  await add('E','TUE',3,'JSF', 'sachin.shetty@campusx.edu', 'CSL33');
  await add('E','TUE',4,'JSF', 'sachin.shetty@campusx.edu', 'CSL33');
  await add('E','TUE',5,'CNC', 'jayapadmini.kanchan@campusx.edu','CS25');
  await add('E','TUE',6,'PC++','pallavi.kn@campusx.edu',    'CS25');
  await add('E','TUE',7,'TOC', 'anupama.hc@campusx.edu',    'CS25');
  await add('E','WED',1,'CNC', 'jayapadmini.kanchan@campusx.edu','CS25');
  await add('E','WED',2,'TOC', 'anupama.hc@campusx.edu',    'CS25');
  await add('E','WED',3,'UHV', 'ankitha.nayak@campusx.edu', 'CS25');
  await add('E','WED',4,'OS',  'dhasny.lm@campusx.edu',     'CS25');
  await add('E','WED',5,'CNC', 'jayapadmini.kanchan@campusx.edu','CSL47');
  await add('E','WED',6,'CNC', 'jayapadmini.kanchan@campusx.edu','CSL47');
  await add('E','THU',1,'TOC', 'anupama.hc@campusx.edu',    'CS25');
  await add('E','THU',2,'SCR', 'simran.banu@campusx.edu',   'CS25');
  await add('E','THU',3,'CNC', 'jayapadmini.kanchan@campusx.edu','CSL46');
  await add('E','THU',4,'CNC', 'jayapadmini.kanchan@campusx.edu','CSL46');
  await add('E','THU',5,'UHV', 'ankitha.nayak@campusx.edu', 'CS25');
  await add('E','THU',6,'OS',  'dhasny.lm@campusx.edu',     'CS25');
  await add('E','THU',7,'AEP', 'dharshan@campusx.edu',      'CS25');
  await add('E','FRI',1,'CNC', 'jayapadmini.kanchan@campusx.edu','CS25');
  await add('E','FRI',2,'UHV', 'ankitha.nayak@campusx.edu', 'CS25');
  await add('E','FRI',3,'ESD', 'shabhana@campusx.edu',      'CS25');
  await add('E','FRI',4,'CNS', 'ganesh.aithal@campusx.edu', 'CS25');
  await add('E','FRI',5,'PC++','pallavi.kn@campusx.edu',    'CSL43');
  await add('E','FRI',6,'PC++','pallavi.kn@campusx.edu',    'CSL43');

  const count = await prisma.timetableEntry.count({ where:{ semesterId:sem.id, class:{ semesterNumber:5 } } });
  console.log(`✅ 5th sem entries seeded: ${count}`);
  console.log('🎉 5th Semester seed complete!');
}

main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());


