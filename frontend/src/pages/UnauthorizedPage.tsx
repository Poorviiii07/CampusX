import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

function homeFor(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/analytics';
    case 'FACULTY':
      return '/faculty/upload';
    case 'STUDENT':
      return '/student/resources';
    default:
      return '/campus-map';
  }
}

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen px-6" style={{ backgroundColor: '#F5F3F1' }}>
      <ShieldX className="text-danger-400 mb-6" size={80} strokeWidth={1} />
      <h1 className="text-3xl font-bold" style={{ color: '#5E574D' }}>Access Restricted</h1>
      <p className="mt-3 text-primary-400 max-w-sm">
        You don't have permission to view this page.
      </p>
      <div className="mt-8 flex gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button variant="primary" onClick={() => navigate(homeFor(user?.role))}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
