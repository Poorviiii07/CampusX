import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Send, Bot, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import client from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageBubble, type ChatMessage } from '@/components/chat/MessageBubble';
import { SuggestionChips } from '@/components/chat/SuggestionChips';
import Button from '@/components/ui/Button';

interface AiQueryResponse {
  response: string;
  intent?: string;
  results?: unknown[];
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

let msgCounter = 0;
function nextId() {
  return `msg-${++msgCounter}`;
}

let convCounter = 0;
function newConversation(): Conversation {
  return {
    id: `conv-${++convCounter}`,
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
  };
}

function truncate(s: string, n = 40) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600">
        <Bot size={16} />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex gap-1 items-center">
          <span className="h-2 w-2 rounded-full bg-accent-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-accent-400 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-accent-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default function AICopilotPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([newConversation()]);
  const [activeConvId, setActiveConvId] = useState(conversations[0].id);
  const [input, setInput] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? conversations[0];

  const queryMutation = useMutation({
    mutationFn: (query: string) =>
      client
        .post<{ data: AiQueryResponse } | AiQueryResponse>('/ai/query', { query })
        .then((res) => {
          const data = (res.data as { data?: AiQueryResponse }).data ?? (res.data as AiQueryResponse);
          return data;
        }),
  });

  // Auto-scroll on new message
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [activeConv.messages, queryMutation.isPending]);

  function updateConv(id: string, updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  async function sendQuery(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    // Update title from first message
    const isFirstMsg = activeConv.messages.length === 0;
    updateConv(activeConvId, (c) => ({
      ...c,
      title: isFirstMsg ? truncate(trimmed) : c.title,
      messages: [...c.messages, userMsg],
    }));

    try {
      const result = await queryMutation.mutateAsync(trimmed);
      const botMsg: ChatMessage = {
        id: nextId(),
        role: 'bot',
        text: result.response ?? 'I received your query but got an unexpected response.',
        intent: result.intent,
        results: result.results,
        timestamp: new Date(),
      };
      updateConv(activeConvId, (c) => ({
        ...c,
        messages: [...c.messages, botMsg],
      }));
    } catch {
      const errMsg: ChatMessage = {
        id: nextId(),
        role: 'bot',
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      updateConv(activeConvId, (c) => ({
        ...c,
        messages: [...c.messages, errMsg],
      }));
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery(input);
    }
  }

  function handleChipSelect(suggestion: string) {
    sendQuery(suggestion);
  }

  function startNewConversation() {
    const conv = newConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
  }

  function deleteConversation(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = newConversation();
        setActiveConvId(fresh.id);
        return [fresh];
      }
      if (id === activeConvId) setActiveConvId(next[0].id);
      return next;
    });
  }

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'U';
  const isEmpty = activeConv.messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Sidebar */}
      <aside className="flex w-64 flex-shrink-0 flex-col bg-primary-900 text-white">
        <div className="flex items-center justify-between px-4 py-4 border-b border-primary-800">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-accent-400" />
            <span className="font-semibold text-sm">AI Copilot</span>
          </div>
          <button
            type="button"
            onClick={startNewConversation}
            title="New conversation"
            className="rounded-md p-1 text-primary-300 hover:bg-primary-800 hover:text-white transition-colors"
            aria-label="Start new conversation"
          >
            <span className="text-lg leading-none">+</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Conversation history">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 px-3 py-2.5 mx-1 rounded-lg cursor-pointer transition-colors ${
                c.id === activeConvId
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`}
              onClick={() => setActiveConvId(c.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveConvId(c.id)}
              aria-current={c.id === activeConvId ? 'page' : undefined}
            >
              <Bot size={14} className="flex-shrink-0 opacity-60" />
              <span className="flex-1 truncate text-xs">{c.title}</span>
              <button
                type="button"
                aria-label="Delete conversation"
                onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 rounded p-0.5 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Message list */}
        <div
          ref={messageListRef}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-primary-50"
        >
          {isEmpty ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-100 text-accent-600 mb-4">
                <Bot size={32} />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Campus AI Copilot</h2>
              <p className="mt-2 text-sm text-gray-500 max-w-sm">
                Ask me about classrooms, timetables, resources, complaints, or anything about the campus.
              </p>
              <div className="mt-6 w-full max-w-lg">
                <SuggestionChips onSelect={handleChipSelect} />
              </div>
            </div>
          ) : (
            <>
              {activeConv.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} userInitial={userInitial} />
              ))}
              {queryMutation.isPending && <TypingIndicator />}
            </>
          )}
        </div>

        {/* Suggestion chips when not empty */}
        {!isEmpty && (
          <div className="px-6 pt-3 pb-0 border-t border-gray-100 bg-white">
            <SuggestionChips onSelect={handleChipSelect} />
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-gray-100 bg-white px-6 py-3">
          <div className="flex items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 focus-within:ring-2 focus-within:ring-accent-500 focus-within:border-accent-500 transition-shadow">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the campus AI anything… (Enter to send)"
              rows={1}
              aria-label="Message input"
              className="flex-1 resize-none bg-transparent py-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none max-h-32"
              style={{ lineHeight: '1.5' }}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => sendQuery(input)}
              disabled={!input.trim() || queryMutation.isPending}
              loading={queryMutation.isPending}
              aria-label="Send message"
              className="flex-shrink-0 mb-0.5"
            >
              <Send size={15} />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-xs text-gray-400">
            AI responses may not be 100% accurate. Always verify critical information.
          </p>
        </div>
      </div>
    </div>
  );
}
