import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

function homeFor(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/analytics';
    case 'FACULTY':
    case 'STUDENT':
      return '/timetable';
    default:
      return '/campus-map';
  }
}

export default function UnauthorizedPage() {
  const { user } = useAuth();
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen px-6">
      <ShieldAlert className="text-danger-500 mb-4" size={56} />
      <h1 className="text-2xl font-bold text-gray-800">Unauthorized</h1>
      <p className="mt-2 text-gray-500">You don't have permission to view this page.</p>
      <Link to={homeFor(user?.role)} className="mt-6">
        <Button variant="primary">Back to your dashboard</Button>
      </Link>
    </div>
  );
}
