/**
 * Removes fake placeholder faculty (faculty@campusx.edu etc.)
 * and their associated timetable entries from the database.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const FAKE_EMAILS = [
  'faculty@campusx.edu','faculty1@campusx.edu','faculty2@campusx.edu',
  'faculty3@campusx.edu','faculty4@campusx.edu','faculty5@campusx.edu',
  'faculty6@campusx.edu','faculty7@campusx.edu','faculty8@campusx.edu',
  'faculty9@campusx.edu','faculty10@campusx.edu','faculty11@campusx.edu',
  'faculty12@campusx.edu','faculty13@campusx.edu','faculty14@campusx.edu',
  'aishwarya2.shetty@campusx.edu', // duplicate
  'dk.sreekantha2@campusx.edu',    // duplicate
  'ankitha.nayak2@campusx.edu',    // duplicate
];

async function main() {
  const fakeUsers = await prisma.user.findMany({
    where: { email: { in: FAKE_EMAILS } },
    select: { id: true, email: true, name: true },
  });
  console.log(`Found ${fakeUsers.length} fake/duplicate users`);

  const fakeIds = fakeUsers.map(u => u.id);
  if (fakeIds.length === 0) { console.log('Nothing to clean up.'); return; }

  // Delete timetable entries pointing to fake faculty
  const ttDel = await prisma.timetableEntry.deleteMany({ where: { facultyId: { in: fakeIds } } });
  console.log(`Deleted ${ttDel.count} timetable entries linked to fake faculty`);

  // Delete fake users
  const uDel = await prisma.user.deleteMany({ where: { id: { in: fakeIds } } });
  console.log(`Deleted ${uDel.count} fake user accounts`);

  console.log('✅ Cleanup complete');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
