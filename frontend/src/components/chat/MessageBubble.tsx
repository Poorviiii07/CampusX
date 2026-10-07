import { Bot } from 'lucide-react';
import { RoomMiniCard, ResourceMiniCard, ComplaintMiniCard } from './InlineCards';
import type { Room, Resource, Complaint } from '@/types';

export type MessageRole = 'user' | 'bot';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  intent?: string;
  results?: unknown[];
  timestamp: Date;
}

interface MessageBubbleProps {
  message: ChatMessage;
  userInitial?: string;
}

function renderInlineCards(intent: string | undefined, results: unknown[] | undefined) {
  if (!results || results.length === 0) return null;

  const locationIntents = ['LOCATION_SEARCH', 'AVAILABILITY_SEARCH', 'ROOM_QUERY'];
  const resourceIntents = ['RESOURCE_SEARCH', 'DOWNLOAD_REQUEST'];
  const complaintIntents = ['COMPLAINT_LIST', 'COMPLAINT_QUERY'];

  if (intent && locationIntents.includes(intent)) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {results.slice(0, 4).map((r, i) => (
          <RoomMiniCard key={i} room={r as Partial<Room> & { code: string }} />
        ))}
      </div>
    );
  }

  if (intent && resourceIntents.includes(intent)) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {results.slice(0, 4).map((r, i) => (
          <ResourceMiniCard key={i} resource={r as Partial<Resource> & { title: string }} />
        ))}
      </div>
    );
  }

  if (intent && complaintIntents.includes(intent)) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {results.slice(0, 4).map((r, i) => (
          <ComplaintMiniCard key={i} complaint={r as Partial<Complaint> & { autoId: string }} />
        ))}
      </div>
    );
  }

  return null;
}

export function MessageBubble({ message, userInitial = 'U' }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white shadow-sm" style={{ backgroundColor: '#9DAD6F' }}>
          {message.text}
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#5E574D' }}>
          {userInitial}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#C3DFE0', color: '#5E574D' }}>
        <Bot size={16} />
      </div>
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm shadow-sm border" style={{ color: '#3D3530', borderColor: '#EBE7E3' }}>
          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
        </div>
        {renderInlineCards(message.intent, message.results)}
      </div>
    </div>
  );
}

export default MessageBubble;
