/**
 * Seed script: Real 3rd Semester Timetable (CSE, 2026-27 Odd)
 * Sections A, B, C, D, E, F
 *
 * Section base rooms (floor 1): A=11, B=12, C=13, D=14, E=15, F=16
 * Labs: CSL36,CSL37,CSL41,CSL42,CSL43
 */

import { PrismaClient, DayOfWeek, SemesterType, RoomType } from '@prisma/client';
const prisma = new PrismaClient();

function pt(p:number){
  const s:Record<number,[string,string]>={
    1:['09:00','09:55'],2:['09:55','10:50'],3:['11:10','12:05'],
    4:['12:05','13:00'],5:['13:55','14:50'],6:['14:50','15:40'],7:['15:40','16:30'],
  };
  const [startTime,endTime]=s[p]??['00:00','00:00'];
  return {startTime,endTime};
}

async function main(){
  console.log('🌱 Seeding 3rd Semester timetable (Sections A-F)...');

  const cseDept = await prisma.department.findFirstOrThrow({where:{code:'CSE'}});
  const cseBuilding = await prisma.building.findFirstOrThrow({where:{code:'CSE'}});

  // Floors
  const floorMap:Record<number,string>={};
  for(let n=1;n<=4;n++){
    let f=await prisma.floor.findFirst({where:{buildingId:cseBuilding.id,floorNumber:n}});
    if(!f) f=await prisma.floor.create({data:{floorNumber:n,name:`CSE Block - Floor ${n}`,buildingId:cseBuilding.id}});
    floorMap[n]=f.id;
  }

  // Rooms
  const roomDefs=[
    // Floor 1 classrooms
    {code:'CS11',name:'Classroom 11',type:'CLASSROOM' as RoomType,cap:65,lab:false},
    {code:'CS12',name:'Classroom 12',type:'CLASSROOM' as RoomType,cap:65,lab:false},
    {code:'CS13',name:'Classroom 13',type:'CLASSROOM' as RoomType,cap:65,lab:false},
    {code:'CS14',name:'Classroom 14',type:'CLASSROOM' as RoomType,cap:65,lab:false},
    {code:'CS15',name:'Classroom 15',type:'CLASSROOM' as RoomType,cap:65,lab:false},
    {code:'CS16',name:'Classroom 16',type:'CLASSROOM' as RoomType,cap:65,lab:false},
    // Labs (floor 3-4)
    {code:'CSL36',name:'Computer Lab 36 (OOP Lab)',type:'LAB' as RoomType,cap:40,lab:true},
    {code:'CSL37',name:'Computer Lab 37 (DS Lab)', type:'LAB' as RoomType,cap:40,lab:true},
    {code:'CSL41',name:'Computer Lab 41',          type:'LAB' as RoomType,cap:40,lab:true},
    {code:'CSL42',name:'Computer Lab 42',          type:'LAB' as RoomType,cap:40,lab:true},
    {code:'CSL43',name:'Computer Lab 43 (R Lab)',  type:'LAB' as RoomType,cap:40,lab:true},
  ];

  function floorFrom(code:string){
    const m=code.match(/^CSL?(\d)/);
    return m?parseInt(m[1],10):1;
  }

  const roomIdMap:Record<string,string>={};
  for(const rd of roomDefs){
    const fn=floorFrom(rd.code);
    let room=await prisma.room.findFirst({where:{code:rd.code}});
    if(!room) room=await prisma.room.create({data:{
      code:rd.code,name:rd.name,type:rd.type,capacity:rd.cap,
      floor:fn,floorId:floorMap[fn],buildingId:cseBuilding.id,department:'CSE',
      equipment:rd.lab?JSON.stringify(['Projector','Computers','40 PCs']):JSON.stringify(['Projector']),
      status:'AVAILABLE',isActive:true,
    }});
    roomIdMap[rd.code]=room.id;
    console.log(`  + room ${rd.code}`);
  }

  // Faculty
  const {default:bcrypt}=await import('bcryptjs');
  const pwd=await bcrypt.hash('Faculty@123',12);
  const fDefs=[
    {name:'Dr. Rajani Salvankar',   email:'rajani.salvankar@campusx.edu'},
    {name:'Dr. P Venkatramana Bhat',email:'venkatramana.bhat@campusx.edu'},
    {name:'Dr. Sannidhan M S',      email:'sannidhan.ms@campusx.edu'},
    {name:'Ms. Soumya Ashwath',     email:'sowmya.ashwath@campusx.edu'},
    {name:'Dr. Sudeepa K B',        email:'sudeepa.kb@campusx.edu'},
    {name:'Dr. Pateel G P',         email:'pateel.gp@campusx.edu'},
    {name:'Ms. Seema P Bangera',    email:'seema.bangera@campusx.edu'},
    {name:'Dr. Rashmi Hegde',       email:'rashmi.hegde@campusx.edu'},
    {name:'Ms. Sowmya S',           email:'sowmya.s@campusx.edu'},
    {name:'Dr. Asmitha Poojary',    email:'asmitha.poojari@campusx.edu'},
    {name:'Mr. Sampath Kini',       email:'sampath.kini@campusx.edu'},
    {name:'Dr. Raju K',             email:'raju.k@campusx.edu'},
    {name:'Dr. Ashwin Shenoy M',    email:'ashwin.shenoy@campusx.edu'},
    {name:'Dr. Dhasny L M',         email:'dhasny.lm@campusx.edu'},
    {name:'Dr. Jyothi Shetty',      email:'jyothi.shetty@campusx.edu'},
    {name:'Ms. Prathwini',          email:'prathwini@campusx.edu'},
    {name:'Dr. Anusha',             email:'anusha@campusx.edu'},
    {name:'Mr. Prithviraj Jain',    email:'prithviraj.jain@campusx.edu'},
    {name:'Ms. Aishwarya D Shetty', email:'aishwarya.shetty@campusx.edu'},
    {name:'Ms. Shilpa M K',         email:'shilpa.mk@campusx.edu'},
    {name:'Dr. Puneeth R P',        email:'puneeth.rp@campusx.edu'},
    {name:'Dr. Minu P A',           email:'minu.pa@campusx.edu'},
    {name:'Mr. Sunil Kumar Aithal', email:'sunil.aithal@campusx.edu'},
    {name:'Dr. Raghunandan K R',    email:'raghunandan.kr@campusx.edu'},
    {name:'Mr. Keerthi Shetty',     email:'keerthi.shetty@campusx.edu'},
    {name:'Dr. Keerthana B C',      email:'keerthana.bc@campusx.edu'},
    {name:'Dr. Govindraj P',        email:'govindraj.p@campusx.edu'},
    {name:'Dr. Sandeep Kumar Hegde',email:'sandeep.hegde@campusx.edu'},
    {name:'Ms. Jayapadmini Kanchan',email:'jayapadmini.kanchan@campusx.edu'},
    {name:'Mr. Pawan Hegde',        email:'pawan.hegde@campusx.edu'},
    {name:'Dr. Sarika Hegde',       email:'sarika.hegde@campusx.edu'},
    {name:'Mr. Pareekshith',        email:'pareekshith@campusx.edu'},
    {name:'Ms. Joylin Priya Pinto', email:'joylin.pinto@campusx.edu'},
    {name:'Ms. Sowmya P',           email:'sowmya.p@campusx.edu'},
    {name:'Dr. Pradeep Kanchan',    email:'pradeep.kanchan@campusx.edu'},
    {name:'Dr. Shashank Shetty',    email:'shashank.shetty@campusx.edu'},
    {name:'Dr. Kumudakshi',         email:'kumudakshi@campusx.edu'},
    {name:'Ms. Anupama H C',        email:'anupama.hc@campusx.edu'},
    {name:'Mr. Akhilraj V Gadagkar', email:'akhilraj.gadagkar@campusx.edu'},
  ];
  const fMap:Record<string,string>={};
  for(const fd of fDefs){
    let u=await prisma.user.findFirst({where:{email:fd.email}});
    if(!u) u=await prisma.user.create({data:{name:fd.name,email:fd.email,password:pwd,role:'FACULTY'}});
    fMap[fd.email]=u.id; fMap[fd.name]=u.id;
  }

  // Subjects
  const subjDefs=[
    {code:'25MAT204',name:'Discrete Mathematical Structures and Probability Theory',short:'Maths'},
    {code:'25CSE201',name:'Data Structures',                                         short:'DS'},
    {code:'25CSE202',name:'Object Oriented Programming',                             short:'OOP'},
    {code:'25CSE211',name:'Computer Architecture and Organization',                  short:'COA'},
    {code:'25ISE111',name:'Software Engineering and Applications',                   short:'SEA'},
    {code:'25CSE221',name:'Data Analysis Using R Programming Lab',                   short:'RLab'},
    {code:'25HSS104',name:'Indian Knowledge Systems and Indian Culture',             short:'IKS'},
    {code:'25HSS231',name:'Developing Professional Skills',                          short:'DPS'},
    {code:'25HSS105',name:'Kannada',                                                 short:'Kannada'},
  ];
  const sMap:Record<string,string>={};
  for(const sd of subjDefs){
    let s=await prisma.subject.findFirst({where:{code:sd.code}});
    if(!s) s=await prisma.subject.create({data:{name:sd.name,code:sd.code,departmentId:cseDept.id,semester:3,credits:3}});
    sMap[sd.code]=s.id; sMap[sd.short]=s.id; sMap[sd.name]=s.id;
  }

  // Semester
  let sem=await prisma.semester.findFirst({where:{academicYear:'2026-27',type:SemesterType.ODD}});
  if(!sem) sem=await prisma.semester.create({data:{academicYear:'2026-27',type:SemesterType.ODD,startDate:new Date('2026-08-01'),endDate:new Date('2026-12-31'),isActive:true}});

  // Classes
  const secs3=[
    {section:'A',strength:65},{section:'B',strength:65},{section:'C',strength:65},
    {section:'D',strength:65},{section:'E',strength:65},{section:'F',strength:65},
  ];
  const clsMap:Record<string,string>={};
  for(const sc of secs3){
    let cls=await prisma.class.findFirst({where:{departmentId:cseDept.id,semesterNumber:3,section:sc.section,semesterId:sem.id}});
    if(!cls) cls=await prisma.class.create({data:{name:`CSE Sem 3 - Section ${sc.section}`,departmentId:cseDept.id,semesterNumber:3,section:sc.section,strength:sc.strength,semesterId:sem.id}});
    clsMap[sc.section]=cls.id;
  }

  async function add(sec:string,day:DayOfWeek,period:number,subj:string,fac:string,room:string){
    const classId=clsMap[sec],subjectId=sMap[subj],facultyId=fMap[fac],roomId=roomIdMap[room];
    if(!subjectId){console.warn(`  ⚠ subj: ${subj}`);return;}
    if(!facultyId){console.warn(`  ⚠ fac: ${fac}`);return;}
    if(!roomId)   {console.warn(`  ⚠ room: ${room}`);return;}
    const ex=await prisma.timetableEntry.findFirst({where:{classId,semesterId:sem!.id,day:day,period:period}});
    if(ex) return;
    const{startTime,endTime}=pt(period);
    try {
      await prisma.timetableEntry.create({data:{classId,subjectId,facultyId,roomId,semesterId:sem!.id,day:day,period:period,startTime,endTime}});
    } catch(e: any) {
      if(e?.code==='P2002'){
        console.warn(`  ⚠ Skipped (constraint): Sec ${sec} ${day} P${period} ${subj} – ${e.meta?.target}`);
      } else {
        throw e;
      }
    }
  }

  // ── 3A (Room 11, Advisor: Ms. Soumya Ashwath) ────────────────────────────
  // MON: Maths(1) OOP(2) SEA(3) COA(4) DS(5) IKS(6) Kannada(7)
  // TUE: OOP(1) DS(2) IKS(3) Maths(4) R Lab(5-6)
  // WED: OOP(1) Maths(2) DS(3) SEA(4) DS Lab(5-6)
  // THU: DS Lab(1-2) SEA(3) DPS(4) Maths(5) COA(6)
  // FRI: DPS(1) DS(2) COA(3) OOP(4)
  console.log('  3A...');
  await add('A','MON',1,'Maths','rajani.salvankar@campusx.edu','CS11');
  await add('A','MON',2,'OOP', 'sannidhan.ms@campusx.edu',   'CS11');
  await add('A','MON',3,'SEA', 'sudeepa.kb@campusx.edu',     'CS11');
  await add('A','MON',4,'COA', 'sowmya.ashwath@campusx.edu', 'CS11');
  await add('A','MON',5,'DS',  'venkatramana.bhat@campusx.edu','CS11');
  await add('A','MON',6,'IKS', 'seema.bangera@campusx.edu',  'CS11');
  await add('A','MON',7,'Kannada','sowmya.s@campusx.edu',    'CS11');
  await add('A','TUE',1,'OOP', 'sannidhan.ms@campusx.edu',  'CS11');
  await add('A','TUE',2,'DS',  'venkatramana.bhat@campusx.edu','CS11');
  await add('A','TUE',3,'IKS', 'seema.bangera@campusx.edu', 'CS11');
  await add('A','TUE',4,'Maths','rajani.salvankar@campusx.edu','CS11');
  await add('A','TUE',5,'RLab','pateel.gp@campusx.edu',     'CSL43');
  await add('A','TUE',6,'RLab','pateel.gp@campusx.edu',     'CSL43');
  await add('A','WED',1,'OOP', 'sannidhan.ms@campusx.edu',  'CS11');
  await add('A','WED',2,'Maths','rajani.salvankar@campusx.edu','CS11');
  await add('A','WED',3,'DS',  'venkatramana.bhat@campusx.edu','CS11');
  await add('A','WED',4,'SEA', 'sudeepa.kb@campusx.edu',    'CS11');
  await add('A','WED',5,'DS',  'venkatramana.bhat@campusx.edu','CSL37');
  await add('A','WED',6,'DS',  'venkatramana.bhat@campusx.edu','CSL37');
  await add('A','THU',1,'DS',  'venkatramana.bhat@campusx.edu','CSL37');
  await add('A','THU',2,'DS',  'venkatramana.bhat@campusx.edu','CSL37');
  await add('A','THU',3,'SEA', 'sudeepa.kb@campusx.edu',    'CS11');
  await add('A','THU',4,'DPS', 'rashmi.hegde@campusx.edu',  'CS11');
  await add('A','THU',5,'Maths','rajani.salvankar@campusx.edu','CS11');
  await add('A','THU',6,'COA', 'sowmya.ashwath@campusx.edu','CS11');
  await add('A','FRI',1,'DPS', 'rashmi.hegde@campusx.edu',  'CS11');
  await add('A','FRI',2,'DS',  'venkatramana.bhat@campusx.edu','CS11');
  await add('A','FRI',3,'COA', 'sowmya.ashwath@campusx.edu','CS11');
  await add('A','FRI',4,'OOP', 'sannidhan.ms@campusx.edu',  'CS11');

  // ── 3B (Room 12, Advisor: Dr. Ashwin Shenoy M) ───────────────────────────
  // MON: DS(1) SEA(2) COA(3) OOP(4) R Lab(5-6)
  // TUE: DS Lab(1-2) DPS(3) IKS(4) Maths(5) OOP(6)
  // WED: SEA(1) OOP(2) Maths(3) DS(4) DPS(5) IKS(6) Kannada(7)
  // THU: OOP(1) Maths(2) COA(3) DS(4) DS Lab(5-6)
  // FRI: Maths(1) COA(2) DS(3) SEA(4)
  console.log('  3B...');
  await add('B','MON',1,'DS',  'asmitha.poojari@campusx.edu','CS12');
  await add('B','MON',2,'SEA', 'ashwin.shenoy@campusx.edu', 'CS12');
  await add('B','MON',3,'COA', 'raju.k@campusx.edu',        'CS12');
  await add('B','MON',4,'OOP', 'sampath.kini@campusx.edu',  'CS12');
  await add('B','MON',5,'RLab','dhasny.lm@campusx.edu',     'CSL43');
  await add('B','MON',6,'RLab','dhasny.lm@campusx.edu',     'CSL43');
  await add('B','TUE',1,'DS',  'asmitha.poojari@campusx.edu','CSL37');
  await add('B','TUE',2,'DS',  'asmitha.poojari@campusx.edu','CSL37');
  await add('B','TUE',3,'DPS', 'rashmi.hegde@campusx.edu',  'CS12');
  await add('B','TUE',4,'IKS', 'seema.bangera@campusx.edu', 'CS12');
  await add('B','TUE',5,'Maths','rajani.salvankar@campusx.edu','CS12');
  await add('B','TUE',6,'OOP', 'sampath.kini@campusx.edu',  'CS12');
  await add('B','WED',1,'SEA', 'ashwin.shenoy@campusx.edu', 'CS12');
  await add('B','WED',2,'OOP', 'sampath.kini@campusx.edu',  'CS12');
  await add('B','WED',3,'Maths','rajani.salvankar@campusx.edu','CS12');
  await add('B','WED',4,'DS',  'asmitha.poojari@campusx.edu','CS12');
  await add('B','WED',5,'DPS', 'rashmi.hegde@campusx.edu',  'CS12');
  await add('B','WED',6,'IKS', 'seema.bangera@campusx.edu', 'CS12');
  await add('B','WED',7,'Kannada','prathwini@campusx.edu',  'CS12');
  await add('B','THU',1,'OOP', 'sampath.kini@campusx.edu',  'CS12');
  await add('B','THU',2,'Maths','rajani.salvankar@campusx.edu','CS12');
  await add('B','THU',3,'COA', 'raju.k@campusx.edu',        'CS12');
  await add('B','THU',4,'DS',  'asmitha.poojari@campusx.edu','CS12');
  await add('B','THU',5,'DS',  'asmitha.poojari@campusx.edu','CSL37');
  await add('B','THU',6,'DS',  'asmitha.poojari@campusx.edu','CSL37');
  await add('B','FRI',1,'Maths','rajani.salvankar@campusx.edu','CS12');
  await add('B','FRI',2,'COA', 'raju.k@campusx.edu',        'CS12');
  await add('B','FRI',3,'DS',  'asmitha.poojari@campusx.edu','CS12');
  await add('B','FRI',4,'SEA', 'ashwin.shenoy@campusx.edu', 'CS12');

  // ── 3C (Room 13, Advisor: Ms. Sowmya S) ──────────────────────────────────
  // MON: DS(1) Maths(2) OOP(3) IKS(4) DS Lab(5-6)
  // TUE: Maths(1) OOP(2) COA(3) SEA(4) DS(5) IKS(6) Kannada(7)
  // WED: R Lab(1-2) DPS(3) OOP(4) COA(5) SEA(6)
  // THU: DS Lab(1-2) Maths(3) DS(4)
  // FRI: OOP(1) COA(2) DS(3) SEA(4) DPS(5) Maths(6)
  console.log('  3C...');
  await add('C','MON',1,'DS',  'prithviraj.jain@campusx.edu','CS13');
  await add('C','MON',2,'Maths','anusha@campusx.edu',        'CS13');
  await add('C','MON',3,'OOP', 'aishwarya.shetty@campusx.edu','CS13');
  await add('C','MON',4,'IKS', 'seema.bangera@campusx.edu', 'CS13');
  await add('C','MON',5,'DS',  'prithviraj.jain@campusx.edu','CSL37');
  await add('C','MON',6,'DS',  'prithviraj.jain@campusx.edu','CSL37');
  await add('C','TUE',1,'Maths','anusha@campusx.edu',        'CS13');
  await add('C','TUE',2,'OOP', 'aishwarya.shetty@campusx.edu','CS13');
  await add('C','TUE',3,'COA', 'shilpa.mk@campusx.edu',     'CS13');
  await add('C','TUE',4,'SEA', 'puneeth.rp@campusx.edu',    'CS13');
  await add('C','TUE',5,'DS',  'prithviraj.jain@campusx.edu','CS13');
  await add('C','TUE',6,'IKS', 'seema.bangera@campusx.edu', 'CS13');
  await add('C','TUE',7,'Kannada','keerthi.shetty@campusx.edu','CS13');
  await add('C','WED',1,'RLab','sowmya.s@campusx.edu',      'CSL43');
  await add('C','WED',2,'RLab','sowmya.s@campusx.edu',      'CSL43');
  await add('C','WED',3,'DPS', 'rashmi.hegde@campusx.edu',  'CS13');
  await add('C','WED',4,'OOP', 'aishwarya.shetty@campusx.edu','CS13');
  await add('C','WED',5,'COA', 'shilpa.mk@campusx.edu',     'CS13');
  await add('C','WED',6,'SEA', 'puneeth.rp@campusx.edu',    'CS13');
  await add('C','THU',1,'DS',  'prithviraj.jain@campusx.edu','CSL41');
  await add('C','THU',2,'DS',  'prithviraj.jain@campusx.edu','CSL41');
  await add('C','THU',3,'Maths','anusha@campusx.edu',        'CS13');
  await add('C','THU',4,'DS',  'prithviraj.jain@campusx.edu','CS13');
  await add('C','FRI',1,'OOP', 'aishwarya.shetty@campusx.edu','CS13');
  await add('C','FRI',2,'COA', 'shilpa.mk@campusx.edu',     'CS13');
  await add('C','FRI',3,'DS',  'prithviraj.jain@campusx.edu','CS13');
  await add('C','FRI',4,'SEA', 'puneeth.rp@campusx.edu',    'CS13');
  await add('C','FRI',5,'DPS', 'rashmi.hegde@campusx.edu',  'CS13');
  await add('C','FRI',6,'Maths','anusha@campusx.edu',        'CS13');

  // ── 3D (Room 14, Advisor: Mr. Keerthi Shetty) ────────────────────────────
  // MON: DS Lab(1-2) Maths(3) DS(4)
  // TUE: COA(1) DS(2) IKS(3) SEA(4) Maths(5) OOP(6)
  // WED: Maths(1) SEA(2) DPS(3) OOP(4) R Lab(5-6)
  // THU: OOP(1) Maths(2) DPS(3) COA(4) DS(5) SEA(6) Kannada(7)
  // FRI: DS(1) OOP(2) COA(3) IKS(4) DS Lab(5-6)
  console.log('  3D...');
  await add('D','MON',1,'DS',  'minu.pa@campusx.edu',       'CSL37');
  await add('D','MON',2,'DS',  'minu.pa@campusx.edu',       'CSL37');
  await add('D','MON',3,'Maths','anusha@campusx.edu',        'CS14');
  await add('D','MON',4,'DS',  'minu.pa@campusx.edu',       'CS14');
  await add('D','TUE',1,'COA', 'raghunandan.kr@campusx.edu','CS14');
  await add('D','TUE',2,'DS',  'minu.pa@campusx.edu',       'CS14');
  await add('D','TUE',3,'IKS', 'seema.bangera@campusx.edu', 'CS14');
  await add('D','TUE',4,'SEA', 'keerthi.shetty@campusx.edu','CS14');
  await add('D','TUE',5,'Maths','anusha@campusx.edu',        'CS14');
  await add('D','TUE',6,'OOP', 'sunil.aithal@campusx.edu',  'CS14');
  await add('D','WED',1,'Maths','anusha@campusx.edu',        'CS14');
  await add('D','WED',2,'SEA', 'keerthi.shetty@campusx.edu','CS14');
  await add('D','WED',3,'DPS', 'rashmi.hegde@campusx.edu',  'CS14');
  await add('D','WED',4,'OOP', 'sunil.aithal@campusx.edu',  'CS14');
  await add('D','WED',5,'RLab','keerthana.bc@campusx.edu',  'CSL43');
  await add('D','WED',6,'RLab','keerthana.bc@campusx.edu',  'CSL43');
  await add('D','THU',1,'OOP', 'sunil.aithal@campusx.edu',  'CS14');
  await add('D','THU',2,'Maths','anusha@campusx.edu',        'CS14');
  await add('D','THU',3,'DPS', 'rashmi.hegde@campusx.edu',  'CS14');
  await add('D','THU',4,'COA', 'raghunandan.kr@campusx.edu','CS14');
  await add('D','THU',5,'DS',  'minu.pa@campusx.edu',       'CS14');
  await add('D','THU',6,'SEA', 'keerthi.shetty@campusx.edu','CS14');
  await add('D','THU',7,'Kannada','keerthana.bc@campusx.edu','CS14');
  await add('D','FRI',1,'DS',  'minu.pa@campusx.edu',       'CS14');
  await add('D','FRI',2,'OOP', 'sunil.aithal@campusx.edu',  'CS14');
  await add('D','FRI',3,'COA', 'raghunandan.kr@campusx.edu','CS14');
  await add('D','FRI',4,'IKS', 'seema.bangera@campusx.edu', 'CS14');
  await add('D','FRI',5,'DS',  'minu.pa@campusx.edu',       'CSL37');
  await add('D','FRI',6,'DS',  'minu.pa@campusx.edu',       'CSL37');

  // ── 3E (Room 15, Advisor: Mr. Pawan Hegde) ───────────────────────────────
  // MON: OOP(1) Maths(2) COA(3) DS(4) IKS(5) SEA(6) Kannada(7)
  // TUE: R Lab(1-2) DPS(3) OOP(4) DS(5) COA(6)
  // WED: DS Lab(1-2) SEA(3) Maths(4) IKS(5) OOP(6)
  // THU: Maths(1) DS(2) SEA(3) COA(4) DS Lab(5-6)
  // FRI: DS(1) OOP(2) Maths(3) DPS(4)
  console.log('  3E...');
  await add('E','MON',1,'OOP', 'pawan.hegde@campusx.edu',   'CS15');
  await add('E','MON',2,'Maths','kumudakshi@campusx.edu',    'CS15');
  await add('E','MON',3,'COA', 'govindraj.p@campusx.edu',   'CS15');
  await add('E','MON',4,'DS',  'sarika.hegde@campusx.edu',  'CS15');
  await add('E','MON',5,'IKS', 'seema.bangera@campusx.edu', 'CS15');
  await add('E','MON',6,'SEA', 'sandeep.hegde@campusx.edu', 'CS15');
  await add('E','MON',7,'Kannada','akhilraj.gadagkar@campusx.edu','CS15');
  await add('E','TUE',1,'RLab','jayapadmini.kanchan@campusx.edu','CSL43');
  await add('E','TUE',2,'RLab','jayapadmini.kanchan@campusx.edu','CSL43');
  await add('E','TUE',3,'DPS', 'rashmi.hegde@campusx.edu',  'CS15');
  await add('E','TUE',4,'OOP', 'pawan.hegde@campusx.edu',   'CS15');
  await add('E','TUE',5,'DS',  'sarika.hegde@campusx.edu',  'CS15');
  await add('E','TUE',6,'COA', 'govindraj.p@campusx.edu',   'CS15');
  await add('E','WED',1,'DS',  'sarika.hegde@campusx.edu',  'CSL37');
  await add('E','WED',2,'DS',  'sarika.hegde@campusx.edu',  'CSL37');
  await add('E','WED',3,'SEA', 'sandeep.hegde@campusx.edu', 'CS15');
  await add('E','WED',4,'Maths','kumudakshi@campusx.edu',    'CS15');
  await add('E','WED',5,'IKS', 'seema.bangera@campusx.edu', 'CS15');
  await add('E','WED',6,'OOP', 'pawan.hegde@campusx.edu',   'CS15');
  await add('E','THU',1,'Maths','kumudakshi@campusx.edu',    'CS15');
  await add('E','THU',2,'DS',  'sarika.hegde@campusx.edu',  'CS15');
  await add('E','THU',3,'SEA', 'sandeep.hegde@campusx.edu', 'CS15');
  await add('E','THU',4,'COA', 'govindraj.p@campusx.edu',   'CS15');
  await add('E','THU',5,'DS',  'sarika.hegde@campusx.edu',  'CSL41');
  await add('E','THU',6,'DS',  'sarika.hegde@campusx.edu',  'CSL41');
  await add('E','FRI',1,'DS',  'sarika.hegde@campusx.edu',  'CS15');
  await add('E','FRI',2,'OOP', 'pawan.hegde@campusx.edu',   'CS15');
  await add('E','FRI',3,'Maths','kumudakshi@campusx.edu',    'CS15');
  await add('E','FRI',4,'DPS', 'rashmi.hegde@campusx.edu',  'CS15');

  // ── 3F (Room 16, Advisor: Ms. Sowmya P) ──────────────────────────────────
  // MON: R Lab(1-2) IKS(3) DS(4) Maths(5) SEA(6) Kannada(7)
  // TUE: Maths(1) DS(2) COA(3) OOP(4) DS Lab(5-6)
  // WED: OOP(1) IKS(2) SEA(3) Maths(4) COA(5) OOP(6)
  // THU: DS(1) DPS(2) Maths(3) SEA(4)
  // FRI: DS Lab(1-2) COA(3) OOP(4) DPS(5) DS(6) IKS(7)
  console.log('  3F...');
  await add('F','MON',1,'RLab','shashank.shetty@campusx.edu','CSL43');
  await add('F','MON',2,'RLab','shashank.shetty@campusx.edu','CSL43');
  await add('F','MON',3,'IKS', 'seema.bangera@campusx.edu', 'CS16');
  await add('F','MON',4,'DS',  'ashwin.shenoy@campusx.edu', 'CS16');
  await add('F','MON',5,'Maths','pareekshith@campusx.edu',  'CS16');
  await add('F','MON',6,'SEA', 'pradeep.kanchan@campusx.edu','CS16');
  await add('F','MON',7,'Kannada','anupama.hc@campusx.edu', 'CS16');
  await add('F','TUE',1,'Maths','pareekshith@campusx.edu',  'CS16');
  await add('F','TUE',2,'DS',  'ashwin.shenoy@campusx.edu', 'CS16');
  await add('F','TUE',3,'COA', 'sowmya.p@campusx.edu',     'CS16');
  await add('F','TUE',4,'OOP', 'joylin.pinto@campusx.edu', 'CS16');
  await add('F','TUE',5,'DS',  'ashwin.shenoy@campusx.edu','CSL37');
  await add('F','TUE',6,'DS',  'ashwin.shenoy@campusx.edu','CSL37');
  await add('F','WED',1,'OOP', 'joylin.pinto@campusx.edu', 'CS16');
  await add('F','WED',2,'IKS', 'seema.bangera@campusx.edu','CS16');
  await add('F','WED',3,'SEA', 'pradeep.kanchan@campusx.edu','CS16');
  await add('F','WED',4,'Maths','pareekshith@campusx.edu',  'CS16');
  await add('F','WED',5,'COA', 'sowmya.p@campusx.edu',     'CS16');
  await add('F','WED',6,'OOP', 'joylin.pinto@campusx.edu', 'CS16');
  await add('F','THU',1,'DS',  'ashwin.shenoy@campusx.edu','CS16');
  await add('F','THU',2,'DPS', 'rashmi.hegde@campusx.edu', 'CS16');
  await add('F','THU',3,'Maths','pareekshith@campusx.edu',  'CS16');
  await add('F','THU',4,'SEA', 'pradeep.kanchan@campusx.edu','CS16');
  await add('F','FRI',1,'DS',  'ashwin.shenoy@campusx.edu','CSL37');
  await add('F','FRI',2,'DS',  'ashwin.shenoy@campusx.edu','CSL37');
  await add('F','FRI',3,'COA', 'sowmya.p@campusx.edu',    'CS16');
  await add('F','FRI',4,'OOP', 'joylin.pinto@campusx.edu','CS16');
  await add('F','FRI',5,'DPS', 'rashmi.hegde@campusx.edu','CS16');
  await add('F','FRI',6,'DS',  'ashwin.shenoy@campusx.edu','CS16');
  await add('F','FRI',7,'IKS', 'seema.bangera@campusx.edu','CS16');

  const count=await prisma.timetableEntry.count({where:{semesterId:sem.id,class:{semesterNumber:3}}});
  console.log(`✅ 3rd sem entries seeded: ${count}`);
  console.log('🎉 3rd Semester seed complete!');
}

main().catch(e=>{console.error(e);process.exit(1);}).finally(()=>prisma.$disconnect());


