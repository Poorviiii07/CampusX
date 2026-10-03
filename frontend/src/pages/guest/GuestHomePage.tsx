import { useNavigate } from 'react-router-dom';
import { Map, Search, Bot, AlertCircle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const ACTIONS = [
  {
    icon: <Map size={28} className="text-primary-600" />,
    title: 'View Campus Map',
    description: 'Explore buildings, floors and rooms across campus.',
    path: '/campus-map',
  },
  {
    icon: <Search size={28} className="text-accent-600" />,
    title: 'Find Available Classroom',
    description: 'Check which rooms are free right now or at a specific time.',
    path: '/find-classroom',
  },
  {
    icon: <Bot size={28} className="text-success-600" />,
    title: 'Campus Chatbot',
    description: 'Ask the AI assistant anything about the campus.',
    path: '/ai-copilot',
  },
];

export default function GuestHomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-8 py-10 px-4">
      {/* Hero */}
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-700 text-white text-2xl font-bold mb-4 shadow-lg">
          X
        </div>
        <h1 className="text-3xl font-bold text-gray-900">CAMPUS-X</h1>
        <p className="mt-2 text-gray-500 text-sm">
          Smart campus management — classrooms, timetables, resources and more.
        </p>
      </div>

      {/* Restriction banner */}
      <div className="flex items-start gap-2 rounded-lg border border-warning-300 bg-warning-50 px-4 py-3 max-w-lg w-full text-sm text-warning-800">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <p>Create an account to access academic resources and advanced features.</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 w-full max-w-2xl">
        {ACTIONS.map((action) => (
          <Card
            key={action.path}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(action.path)}
            tabIndex={0}
            role="button"
            aria-label={action.title}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(action.path)}
          >
            <CardBody className="flex flex-col items-center gap-2 text-center py-6">
              {action.icon}
              <p className="font-semibold text-gray-800">{action.title}</p>
              <p className="text-xs text-gray-500">{action.description}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Button variant="primary" onClick={() => navigate('/login')}>
        Sign In / Create Account
      </Button>
    </div>
  );
}
