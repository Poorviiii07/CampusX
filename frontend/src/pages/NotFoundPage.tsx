import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen px-6 bg-primary-50">
      <Building2 className="text-primary-300 mb-6" size={80} strokeWidth={1} />
      <h1 className="text-5xl font-bold text-primary-900">404</h1>
      <h2 className="mt-2 text-xl font-semibold text-gray-700">Page Not Found</h2>
      <p className="mt-3 text-gray-500 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="mt-8">
        <Button variant="primary" size="lg">
          Go Home
        </Button>
      </Link>
    </div>
  );
}
