/**
 * seed-real-campus.ts
 * Replaces all fake faculty + random rooms with real NMAMIT CSE Department data.
 *
 * ROOM LAYOUT (CSE Block):
 *  Ground Floor (0): Placement Dept, GD Room 1 & 2, Placement Coordinator Cabin,
 *                    Counsellor Cabin, Placement Lab
 *  Floor 1:  Girls/Boys/Staff Washrooms, Classrooms 11–18, Ladies Room, Library
 *  Floor 2:  Washrooms (Girls/Boys/Staff), Mens Room, Classrooms 21–28
 *  Floor 3:  Labs 31–35, HOD Cabin, Staff Rooms, Washrooms
 *  Floor 4:  Labs 41–45, Staff Rooms
 *
 * FACULTY: Real NMAMIT CSE faculty as listed in timetables + department page
 */

import { PrismaClient, RoomStatus, RoomType, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🏫 Seeding real NMAMIT CSE campus layout + faculty...');

  // ── Get or create CSE Building ─────────────────────────────────────────────
  let cseBuilding = await prisma.building.findFirst({ where: { code: 'CSE' } });
  if (!cseBuilding) {
    cseBuilding = await prisma.building.create({
      data: {
        code: 'CSE',
        name: 'CSE Block',
        totalFloors: 5,
        description: 'Computer Science & Engineering Department Block — NMAMIT, Nitte',
      },
    });
  } else {
    // Update floor count
    await prisma.building.update({ where: { id: cseBuilding.id }, data: { totalFloors: 5 } });
  }

  // ── Floors 0–4 ─────────────────────────────────────────────────────────────
  const floorDefs = [
    { n: 0, name: 'CSE Block - Ground Floor' },
    { n: 1, name: 'CSE Block - First Floor' },
    { n: 2, name: 'CSE Block - Second Floor' },
    { n: 3, name: 'CSE Block - Third Floor' },
    { n: 4, name: 'CSE Block - Fourth Floor' },
  ];
  const floorMap: Record<number, string> = {};
  for (const fd of floorDefs) {
    let floor = await prisma.floor.findFirst({ where: { buildingId: cseBuilding.id, floorNumber: fd.n } });
    if (!floor) {
      floor = await prisma.floor.create({
        data: { floorNumber: fd.n, name: fd.name, buildingId: cseBuilding.id },
      });
    }
    floorMap[fd.n] = floor.id;
  }

  // ── Delete OLD rooms for CSE block (old fake rooms like CSE-101 etc) ────────
  // We only delete rooms that follow the old fake naming pattern
  await prisma.room.deleteMany({
    where: {
      buildingId: cseBuilding.id,
      code: { in: [
        'CSE-101','CSE-102','CSE-103','CSE-201','CSE-202','CSE-203','CSE-204',
        'CSE-301','CSE-302','CSE-303','CSE-401','CSE-402','CSE-403',
        'CSE-LAB1','CSE-LAB2','CSE-LAB3',
        'CSE-HOD','CSE-SR1','CSE-SR2','CSE-WR1L','CSE-WR2L','CSE-WR1G','CSE-WR2G',
        'CSE-LIB1','CSE-SH1','CSE-AUD1',
        'FC-101','FC-102','FC-103','FC-104','FC-105','FC-106','FC-107','FC-108',
        'FC-109','FC-110','FC-111','FC-112','FC-113','FC-114','FC-115','FC-116',
        'FC-117','FC-118','FC-119','FC-120',
      ]},
    },
  });

  // ── Room definitions ────────────────────────────────────────────────────────
  type RoomDef = {
    code: string; name: string; type: RoomType; floor: number;
    capacity: number; equipment: string; description?: string;
  };

  const rooms: RoomDef[] = [
    // ── GROUND FLOOR ──────────────────────────────────────────────────────────
    { code:'CSE-GD-PLACE', name:'Placement Department',         type:'OFFICE',    floor:0, capacity:20,  equipment:'[]',                         description:'Placement & Training Office' },
    { code:'CSE-GD-GDR1',  name:'GD Room 1',                   type:'SEMINAR_HALL', floor:0, capacity:20, equipment:'["Projector"]',              description:'Group Discussion Room 1' },
    { code:'CSE-GD-GDR2',  name:'GD Room 2',                   type:'SEMINAR_HALL', floor:0, capacity:20, equipment:'["Projector"]',              description:'Group Discussion Room 2' },
    { code:'CSE-GD-PCC',   name:'Placement Coordinator Cabin', type:'FACULTY_CABIN', floor:0, capacity:5, equipment:'[]',                        description:'Placement Coordinator Office' },
    { code:'CSE-GD-COUN',  name:'Counsellor Cabin',            type:'FACULTY_CABIN', floor:0, capacity:5, equipment:'[]',                        description:'Student Counsellor Office' },
    { code:'CSE-GD-PLAB',  name:'Placement Lab',               type:'LAB',       floor:0, capacity:40, equipment:'["Computers","Projector"]',    description:'Placement Training Lab' },

    // ── FIRST FLOOR ───────────────────────────────────────────────────────────
    { code:'CS11', name:'Classroom 11', type:'CLASSROOM', floor:1, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS12', name:'Classroom 12', type:'CLASSROOM', floor:1, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS13', name:'Classroom 13', type:'CLASSROOM', floor:1, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS14', name:'Classroom 14', type:'CLASSROOM', floor:1, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS15', name:'Classroom 15', type:'CLASSROOM', floor:1, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS16', name:'Classroom 16', type:'CLASSROOM', floor:1, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS17', name:'Classroom 17', type:'CLASSROOM', floor:1, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS18', name:'Classroom 18', type:'CLASSROOM', floor:1, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CSE-1-LIB',    name:'Library',                     type:'LIBRARY',   floor:1, capacity:80,  equipment:'["WiFi","Reading Tables"]',   description:'Department Library' },
    { code:'CSE-1-LADIES', name:'Ladies Room',                 type:'RESTROOM',  floor:1, capacity:1,   equipment:'[]',                          description:'Ladies Washroom - Floor 1' },
    { code:'CSE-1-BOYS',   name:'Boys Washroom',               type:'RESTROOM',  floor:1, capacity:1,   equipment:'[]',                          description:'Gents Washroom - Floor 1' },
    { code:'CSE-1-STAFF',  name:'Staff Washroom (F1)',         type:'RESTROOM',  floor:1, capacity:1,   equipment:'[]',                          description:'Staff Washroom - Floor 1' },

    // ── SECOND FLOOR ──────────────────────────────────────────────────────────
    { code:'CS21', name:'Classroom 21', type:'CLASSROOM', floor:2, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS22', name:'Classroom 22', type:'CLASSROOM', floor:2, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS23', name:'Classroom 23', type:'CLASSROOM', floor:2, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS24', name:'Classroom 24', type:'CLASSROOM', floor:2, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS25', name:'Classroom 25', type:'CLASSROOM', floor:2, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS26', name:'Classroom 26', type:'CLASSROOM', floor:2, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS27', name:'Classroom 27', type:'CLASSROOM', floor:2, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CS28', name:'Classroom 28', type:'CLASSROOM', floor:2, capacity:65, equipment:'["Projector","Smart Board","AC"]' },
    { code:'CSE-2-MENS',   name:"Men's Room",                  type:'RESTROOM',  floor:2, capacity:1,   equipment:'[]',                          description:"Gents Washroom - Floor 2" },
    { code:'CSE-2-LADIES', name:'Ladies Washroom',             type:'RESTROOM',  floor:2, capacity:1,   equipment:'[]',                          description:'Ladies Washroom - Floor 2' },
    { code:'CSE-2-STAFF',  name:'Staff Washroom (F2)',         type:'RESTROOM',  floor:2, capacity:1,   equipment:'[]',                          description:'Staff Washroom - Floor 2' },

    // ── THIRD FLOOR ───────────────────────────────────────────────────────────
    { code:'CSL31', name:'Computer Lab 31', type:'LAB', floor:3, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 31' },
    { code:'CSL32', name:'Computer Lab 32', type:'LAB', floor:3, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 32' },
    { code:'CSL33', name:'Computer Lab 33', type:'LAB', floor:3, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 33 — Java/Spring Framework Lab' },
    { code:'CSL34', name:'Computer Lab 34', type:'LAB', floor:3, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 34' },
    { code:'CSL35', name:'Computer Lab 35', type:'LAB', floor:3, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 35 — CG & PC++ Lab' },
    { code:'CSE-3-HOD',    name:'HOD Cabin',                   type:'FACULTY_CABIN', floor:3, capacity:8, equipment:'["AC"]',                    description:'Head of Department — CSE' },
    { code:'CSE-3-SR1',    name:'Staff Room 3A',               type:'STAFF_ROOM', floor:3, capacity:20, equipment:'["AC"]',                      description:'Faculty Staff Room — Floor 3A' },
    { code:'CSE-3-SR2',    name:'Staff Room 3B',               type:'STAFF_ROOM', floor:3, capacity:20, equipment:'["AC"]',                      description:'Faculty Staff Room — Floor 3B' },
    { code:'CSE-3-LADIES', name:'Ladies Washroom (F3)',        type:'RESTROOM',  floor:3, capacity:1,   equipment:'[]' },
    { code:'CSE-3-GENTS',  name:'Gents Washroom (F3)',         type:'RESTROOM',  floor:3, capacity:1,   equipment:'[]' },
    { code:'CSE-3-STAFF',  name:'Staff Washroom (F3)',         type:'RESTROOM',  floor:3, capacity:1,   equipment:'[]' },

    // ── FOURTH FLOOR ──────────────────────────────────────────────────────────
    { code:'CSL41', name:'Computer Lab 41', type:'LAB', floor:4, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 41' },
    { code:'CSL42', name:'Computer Lab 42', type:'LAB', floor:4, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 42' },
    { code:'CSL43', name:'Computer Lab 43', type:'LAB', floor:4, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 43 — R Programming Lab' },
    { code:'CSL44', name:'Computer Lab 44', type:'LAB', floor:4, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 44' },
    { code:'CSL45', name:'Computer Lab 45', type:'LAB', floor:4, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 45 — NDB/DM Lab' },
    { code:'CSL46', name:'Computer Lab 46', type:'LAB', floor:4, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 46 — OS Lab' },
    { code:'CSL47', name:'Computer Lab 47', type:'LAB', floor:4, capacity:40, equipment:'["Computers","Projector","AC","WiFi"]', description:'CSE Lab 47 — CNC Lab' },
    { code:'CSE-4-SR1',    name:'Staff Room 4A',               type:'STAFF_ROOM', floor:4, capacity:20, equipment:'["AC"]',                      description:'Faculty Staff Room — Floor 4A' },
    { code:'CSE-4-SR2',    name:'Staff Room 4B',               type:'STAFF_ROOM', floor:4, capacity:20, equipment:'["AC"]',                      description:'Faculty Staff Room — Floor 4B' },
  ];

  let roomsCreated = 0;
  for (const rd of rooms) {
    const existing = await prisma.room.findFirst({ where: { code: rd.code } });
    if (!existing) {
      await prisma.room.create({
        data: {
          code: rd.code,
          name: rd.name,
          type: rd.type,
          capacity: rd.capacity,
          equipment: rd.equipment,
          status: RoomStatus.AVAILABLE,
          isActive: true,
          floorId: floorMap[rd.floor],
          buildingId: cseBuilding.id,
          department: 'CSE',
          description: rd.description ?? '',
        },
      });
      roomsCreated++;
      console.log(`  + ${rd.code} — ${rd.name}`);
    } else {
      // Update equipment and description in case they changed
      await prisma.room.update({
        where: { id: existing.id },
        data: { equipment: rd.equipment, description: rd.description ?? '', floorId: floorMap[rd.floor] },
      });
    }
  }

  console.log(`\n✅ Rooms: ${roomsCreated} created / ${rooms.length - roomsCreated} already existed`);

  // ── REAL NMAMIT CSE FACULTY ─────────────────────────────────────────────────
  // Source: Timetable PDFs (2026-27) + https://nitte.edu.in/nmamit/department-computer-science.php
  const { default: bcrypt } = await import('bcryptjs');
  const pwd = await bcrypt.hash('Faculty@123', 12);

  const facultyList = [
    // HOD
    { name: 'Dr. Jyothi Shetty',          email: 'jyothi.shetty@campusx.edu',         designation: 'Professor & HOD' },
    // Professors
    { name: 'Dr. Surendra Shetty',         email: 'surendra.shetty@campusx.edu',        designation: 'Professor' },
    { name: 'Dr. D K Sreekantha',          email: 'dk.sreekantha@campusx.edu',          designation: 'Professor' },
    { name: 'Dr. Ganesh Aithal',           email: 'ganesh.aithal@campusx.edu',          designation: 'Professor' },
    { name: 'Dr. Balasubramani R',         email: 'balasubramani.r@campusx.edu',        designation: 'Professor' },
    { name: 'Dr. Sarika Hegde',            email: 'sarika.hegde@campusx.edu',           designation: 'Professor' },
    { name: 'Dr. Karthik Pai',             email: 'karthik.pai@campusx.edu',            designation: 'Professor' },
    { name: 'Dr. Venugopal P S',           email: 'venugopal.ps@campusx.edu',           designation: 'Professor' },
    // Associate Professors
    { name: 'Dr. Shabari Shedthi B',       email: 'shabari.shedthi@campusx.edu',        designation: 'Associate Professor' },
    { name: 'Dr. Sudeepa K B',             email: 'sudeepa.kb@campusx.edu',             designation: 'Associate Professor' },
    { name: 'Dr. Aravinda C V',            email: 'aravinda.cv@campusx.edu',            designation: 'Associate Professor' },
    { name: 'Dr. Govindraj P',             email: 'govindraj.p@campusx.edu',            designation: 'Associate Professor' },
    { name: 'Dr. Raghunandan K R',         email: 'raghunandan.kr@campusx.edu',         designation: 'Associate Professor' },
    { name: 'Dr. Sannidhan M S',           email: 'sannidhan.ms@campusx.edu',           designation: 'Associate Professor' },
    { name: 'Dr. Keerthana B C',           email: 'keerthana.bc@campusx.edu',           designation: 'Associate Professor' },
    { name: 'Dr. Puneeth R P',             email: 'puneeth.rp@campusx.edu',             designation: 'Associate Professor' },
    { name: 'Dr. Ashwin Shenoy M',         email: 'ashwin.shenoy@campusx.edu',          designation: 'Associate Professor' },
    { name: 'Dr. Minu P A',                email: 'minu.pa@campusx.edu',                designation: 'Associate Professor' },
    { name: 'Dr. Pateel G P',              email: 'pateel.gp@campusx.edu',              designation: 'Associate Professor' },
    { name: 'Dr. Pradeep Kanchan',         email: 'pradeep.kanchan@campusx.edu',        designation: 'Associate Professor' },
    { name: 'Dr. Pallavi K N',             email: 'pallavi.kn@campusx.edu',             designation: 'Associate Professor' },
    { name: 'Dr. Vijaya Murari T',         email: 'vijaya.murari@campusx.edu',          designation: 'Associate Professor' },
    { name: 'Dr. Dhasny L M',              email: 'dhasny.lm@campusx.edu',              designation: 'Associate Professor' },
    { name: 'Dr. Savitha Shetty',          email: 'savitha.shetty@campusx.edu',         designation: 'Associate Professor' },
    { name: 'Dr. Sandeep Kumar Hegde',     email: 'sandeep.hegde@campusx.edu',          designation: 'Associate Professor' },
    { name: 'Dr. Asmitha Poojari',         email: 'asmitha.poojari@campusx.edu',        designation: 'Associate Professor' },
    { name: 'Dr. Shashank Shetty',         email: 'shashank.shetty@campusx.edu',        designation: 'Associate Professor' },
    { name: 'Dr. Raju K',                  email: 'raju.k@campusx.edu',                 designation: 'Associate Professor' },
    { name: 'Dr. Rajalaxmi S Hegde',       email: 'rajalaxmi.hegde@campusx.edu',        designation: 'Associate Professor' },
    { name: 'Dr. Anusha',                  email: 'anusha@campusx.edu',                 designation: 'Associate Professor' },
    { name: 'Dr. Kumudakshi',              email: 'kumudakshi@campusx.edu',             designation: 'Associate Professor' },
    // Assistant Professors
    { name: 'Ms. Shilpa M K',             email: 'shilpa.mk@campusx.edu',              designation: 'Assistant Professor' },
    { name: 'Ms. Aishwarya D Shetty',     email: 'aishwarya.shetty@campusx.edu',       designation: 'Assistant Professor' },
    { name: 'Ms. Sowmya Ashwath',         email: 'sowmya.ashwath@campusx.edu',         designation: 'Assistant Professor' },
    { name: 'Ms. Ankitha A Nayak',        email: 'ankitha.nayak@campusx.edu',          designation: 'Assistant Professor' },
    { name: 'Ms. Anupama H C',            email: 'anupama.hc@campusx.edu',             designation: 'Assistant Professor' },
    { name: 'Ms. Sadiya Mubarak',         email: 'sadiya.mubarak@campusx.edu',         designation: 'Assistant Professor' },
    { name: 'Ms. Sowmya S',               email: 'sowmya.s@campusx.edu',               designation: 'Assistant Professor' },
    { name: 'Ms. Sowmya P',               email: 'sowmya.p@campusx.edu',               designation: 'Assistant Professor' },
    { name: 'Ms. Manasa G R',             email: 'manasa.gr@campusx.edu',              designation: 'Assistant Professor' },
    { name: 'Ms. B Vijetha',              email: 'b.vijetha@campusx.edu',              designation: 'Assistant Professor' },
    { name: 'Ms. Vijetha B',              email: 'vijetha.b@campusx.edu',              designation: 'Assistant Professor' },
    { name: 'Ms. Jayapadmini Kanchan',    email: 'jayapadmini.kanchan@campusx.edu',    designation: 'Assistant Professor' },
    { name: 'Ms. Simran Banu',            email: 'simran.banu@campusx.edu',             designation: 'Assistant Professor' },
    { name: 'Ms. Shabhana',               email: 'shabhana@campusx.edu',               designation: 'Assistant Professor' },
    { name: 'Ms. Prathwini',              email: 'prathwini@campusx.edu',              designation: 'Assistant Professor' },
    { name: 'Ms. Anushree',               email: 'anushree@campusx.edu',               designation: 'Assistant Professor' },
    { name: 'Ms. Joylin Priya Pinto',     email: 'joylin.pinto@campusx.edu',           designation: 'Assistant Professor' },
    { name: 'Mr. Sreekiran Bhat',         email: 'sreekiran.bhat@campusx.edu',          designation: 'Assistant Professor' },
    { name: 'Mr. Prajwal Rao',            email: 'prajwal.rao@campusx.edu',             designation: 'Assistant Professor' },
    { name: 'Mr. Sampath Kini',           email: 'sampath.kini@campusx.edu',            designation: 'Assistant Professor' },
    { name: 'Mr. Sunil Kumar Aithal',     email: 'sunil.aithal@campusx.edu',            designation: 'Assistant Professor' },
    { name: 'Mr. Pawan Hegde',            email: 'pawan.hegde@campusx.edu',             designation: 'Assistant Professor' },
    { name: 'Mr. Keerthi Shetty',         email: 'keerthi.shetty@campusx.edu',          designation: 'Assistant Professor' },
    { name: 'Mr. Prithviraj Jain',        email: 'prithviraj.jain@campusx.edu',         designation: 'Assistant Professor' },
    { name: 'Mr. Akhilraj V Gadagkar',    email: 'akhilraj.gadagkar@campusx.edu',       designation: 'Assistant Professor' },
    { name: 'Mr. Guruprasad',             email: 'guruprasad@campusx.edu',              designation: 'Assistant Professor' },
    { name: 'Mr. Sachin Shetty',          email: 'sachin.shetty@campusx.edu',           designation: 'Assistant Professor' },
    { name: 'Mr. Dharshan',               email: 'dharshan@campusx.edu',               designation: 'Assistant Professor' },
    { name: 'Mr. Basavangouda',           email: 'basavangouda@campusx.edu',            designation: 'Assistant Professor' },
    { name: 'Mr. Nagaraj K C',            email: 'nagaraj.kc@campusx.edu',              designation: 'Assistant Professor' },
    { name: 'Mr. Pareekshith',            email: 'pareekshith@campusx.edu',             designation: 'Assistant Professor' },
    { name: 'Mr. Suhail Ahmed Nisar Saha',email: 'suhail.saha@campusx.edu',             designation: 'Assistant Professor' },
    // Non-teaching / other staff referenced in timetables
    { name: 'Mr. Keerthan Dixit',         email: 'keerthan.dixit@campusx.edu',          designation: 'Assistant Professor' },
    { name: 'Dr. D K Sreekantha',         email: 'dk.sreekantha2@campusx.edu',          designation: 'Professor' }, // avoid duplicate email
    { name: 'Ms. Ankitha A Nayak',        email: 'ankitha.nayak2@campusx.edu',          designation: 'Assistant Professor' },
  ];

  // Deduplicate by email
  const seen = new Set<string>();
  const uniqueFaculty = facultyList.filter(f => {
    if (seen.has(f.email)) return false;
    seen.add(f.email);
    return true;
  });

  let facCreated = 0, facUpdated = 0;
  for (const fd of uniqueFaculty) {
    const existing = await prisma.user.findFirst({ where: { email: fd.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: fd.name,
          email: fd.email,
          password: pwd,
          role: Role.FACULTY,
        },
      });
      facCreated++;
    } else {
      // Update name in case it was a placeholder
      if (existing.name.startsWith('Dr. ') || existing.name.startsWith('Ms. ') || existing.name.startsWith('Mr. ')) {
        // Already a real name, just ensure correct
        await prisma.user.update({ where: { id: existing.id }, data: { name: fd.name } });
      }
      facUpdated++;
    }
  }
  console.log(`\n✅ Faculty: ${facCreated} created, ${facUpdated} updated`);

  // ── Faculty cabin assignments for Floor 3 staff rooms ─────────────────────
  // Create individual faculty cabins in staff rooms
  const cabinDefs = [
    { code:'CSE-3-HOD',  name:'HOD Cabin — Dr. Jyothi Shetty',        floor:3, description:'Head of Department, CSE' },
  ];
  for (const cd of cabinDefs) {
    const existing = await prisma.room.findFirst({ where: { code: cd.code } });
    if (existing) {
      await prisma.room.update({ where: { id: existing.id }, data: { name: cd.name, description: cd.description } });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalRooms = await prisma.room.count({ where: { buildingId: cseBuilding.id } });
  const totalFaculty = await prisma.user.count({ where: { role: 'FACULTY' } });
  console.log('\n══════════════════════════════════');
  console.log(`  CSE Block rooms : ${totalRooms}`);
  console.log(`  Faculty users   : ${totalFaculty}`);
  console.log('══════════════════════════════════');
  console.log('🎉 Real campus seed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
