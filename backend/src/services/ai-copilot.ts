import axios from 'axios';
import { prisma } from '../lib/prisma';

export type Intent =
  | 'LOCATION_SEARCH'
  | 'AVAILABILITY_SEARCH'
  | 'RESOURCE_SEARCH'
  | 'COMPLAINT_QUERY'
  | 'TIMETABLE_QUERY'
  | 'GENERAL_INFO';

const LOCATION_KEYWORDS = ['where is', 'find', 'locate', 'room', 'lab', 'cabin', 'restroom', 'where are'];
const AVAILABILITY_KEYWORDS = ['available', 'free', 'empty', 'vacant', 'not occupied', 'which rooms'];
const RESOURCE_KEYWORDS = ['question paper', 'notes', 'subject', 'download', 'study material', 'resource', 'previous year'];
const COMPLAINT_KEYWORDS = ['complaint', 'issue', 'problem', 'status', 'report', 'broken'];
const TIMETABLE_KEYWORDS = ['timetable', 'schedule', 'class', 'period', 'when is', 'which period'];

export function classifyIntent(query: string): Intent {
  const q = query.toLowerCase();
  if (AVAILABILITY_KEYWORDS.some((k) => q.includes(k))) return 'AVAILABILITY_SEARCH';
  if (RESOURCE_KEYWORDS.some((k) => q.includes(k))) return 'RESOURCE_SEARCH';
  if (COMPLAINT_KEYWORDS.some((k) => q.includes(k))) return 'COMPLAINT_QUERY';
  if (TIMETABLE_KEYWORDS.some((k) => q.includes(k))) return 'TIMETABLE_QUERY';
  if (LOCATION_KEYWORDS.some((k) => q.includes(k))) return 'LOCATION_SEARCH';
  return 'GENERAL_INFO';
}

async function extractEntitiesWithGPT(query: string): Promise<Record<string, string>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return {};

  try {
    const resp = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Extract entities from the query as JSON with keys: roomCode, buildingName, roomType, subjectCode, facultyName, period. Only include keys that appear in the query. Reply with JSON only.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 100,
      },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const text: string = resp.data.choices[0].message.content;
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function extractEntitiesLocal(query: string): Record<string, string> {
  const entities: Record<string, string> = {};
  const q = query.toLowerCase();

  // Extract room types
  if (q.includes('restroom') || q.includes('bathroom') || q.includes('toilet')) {
    if (q.includes('ladies') || q.includes("women") || q.includes("female") || q.includes("girl")) {
      entities.roomType = 'RESTROOM';
      entities.gender = 'ladies';
    } else if (q.includes('men') || q.includes('gents') || q.includes('male') || q.includes('boy')) {
      entities.roomType = 'RESTROOM';
      entities.gender = 'men';
    } else {
      entities.roomType = 'RESTROOM';
    }
  } else if (q.includes('lab')) {
    entities.roomType = 'LAB';
  } else if (q.includes('cabin')) {
    entities.roomType = 'FACULTY_CABIN';
  } else if (q.includes('seminar')) {
    entities.roomType = 'SEMINAR_HALL';
  } else if (q.includes('library')) {
    entities.roomType = 'LIBRARY';
  } else if (q.includes('auditorium')) {
    entities.roomType = 'AUDITORIUM';
  }

  // Extract building
  if (q.includes('cse block') || q.includes('cse building')) entities.buildingCode = 'CSE';
  else if (q.includes('main block') || q.includes('main building')) entities.buildingCode = 'MAIN';
  else if (q.includes('science block')) entities.buildingCode = 'SCI';
  else if (q.includes('admin block')) entities.buildingCode = 'ADM';
  else if (q.includes('library block')) entities.buildingCode = 'LIB';

  // Extract subject code patterns like 21CS, CD, DBMS
  const subjectMatch = query.match(/\b([A-Z]{2,6}\d{0,4})\b/);
  if (subjectMatch) entities.subjectCode = subjectMatch[1];

  return entities;
}

export async function queryDB(
  intent: Intent,
  query: string,
  userRole: string
): Promise<{ found: boolean; message: string; data: unknown[] }> {
  const notFound = { found: false, message: "I couldn't find that in the campus database", data: [] };

  // Try GPT entity extraction, fall back to local
  let entities = await extractEntitiesWithGPT(query);
  if (Object.keys(entities).length === 0) {
    entities = extractEntitiesLocal(query);
  }

  try {
    if (intent === 'LOCATION_SEARCH') {
      const where: Record<string, unknown> = { isActive: true };
      if (entities.roomType) where.type = entities.roomType;
      if (entities.buildingCode) {
        const building = await prisma.building.findFirst({ where: { code: entities.buildingCode } });
        if (building) where.buildingId = building.id;
      }
      if (entities.gender === 'ladies') {
        where.name = { contains: "Women", mode: 'insensitive' };
      } else if (entities.gender === 'men') {
        where.name = { contains: "Men", mode: 'insensitive' };
      }

      const rooms = await prisma.room.findMany({
        where: where as any,
        include: {
          building: { select: { name: true, code: true } },
          floorRelation: { select: { floorNumber: true, name: true } },
        },
        take: 10,
      });

      if (rooms.length === 0) return notFound;
      return {
        found: true,
        message: `Found ${rooms.length} location(s) matching your query.`,
        data: rooms,
      };
    }

    if (intent === 'AVAILABILITY_SEARCH') {
      const rooms = await prisma.room.findMany({
        where: { isActive: true, status: 'AVAILABLE' },
        include: {
          building: { select: { name: true, code: true } },
          floorRelation: { select: { floorNumber: true } },
        },
        take: 20,
      });
      return {
        found: rooms.length > 0,
        message: rooms.length > 0 ? `${rooms.length} rooms are currently available.` : 'No rooms are currently available.',
        data: rooms,
      };
    }

    if (intent === 'RESOURCE_SEARCH') {
      const where: Record<string, unknown> = { isPublic: true };
      if (userRole === 'STUDENT') where.isApproved = true;
      if (entities.subjectCode) {
        const subject = await prisma.subject.findFirst({
          where: { code: { contains: entities.subjectCode, mode: 'insensitive' } },
        });
        if (subject) where.subjectId = subject.id;
      }
      const resources = await prisma.resource.findMany({
        where: where as any,
        include: { subject: { select: { code: true, name: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      if (resources.length === 0) return notFound;
      return { found: true, message: `Found ${resources.length} resource(s).`, data: resources };
    }

    if (intent === 'COMPLAINT_QUERY') {
      if (userRole === 'STUDENT') {
        return { found: false, message: 'Please check your complaints in the complaints section.', data: [] };
      }
      const complaints = await prisma.complaint.findMany({
        where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
        select: { autoId: true, category: true, status: true, description: true, createdAt: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      return {
        found: complaints.length > 0,
        message: `${complaints.length} open complaint(s) found.`,
        data: complaints,
      };
    }

    if (intent === 'TIMETABLE_QUERY') {
      const activeSemester = await prisma.semester.findFirst({ where: { isActive: true } });
      if (!activeSemester) return { found: false, message: 'No active semester found.', data: [] };

      const entries = await prisma.timetableEntry.findMany({
        where: { semesterId: activeSemester.id },
        include: {
          class: true,
          subject: { select: { code: true, name: true } },
          faculty: { select: { name: true } },
          room: { select: { code: true, name: true } },
        },
        take: 20,
        orderBy: [{ day: 'asc' }, { period: 'asc' }],
      });
      return {
        found: entries.length > 0,
        message: `Found ${entries.length} timetable entries for active semester.`,
        data: entries,
      };
    }

    // GENERAL_INFO
    const buildings = await prisma.building.findMany({
      where: { isActive: true },
      select: { name: true, code: true, totalFloors: true },
    });
    return {
      found: true,
      message: 'Here is a summary of the campus.',
      data: buildings,
    };
  } catch (err) {
    console.error('AI Copilot query error:', err);
    return notFound;
  }
}
