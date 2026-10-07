import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen px-6" style={{ backgroundColor: '#F5F3F1' }}>
      <Building2 style={{ color: '#C3DFE0' }} className="mb-6" size={80} strokeWidth={1} />
      <h1 className="text-5xl font-bold" style={{ color: '#5E574D' }}>404</h1>
      <h2 className="mt-2 text-xl font-semibold" style={{ color: '#7D6D61' }}>Page Not Found</h2>
      <p className="mt-3 text-primary-400 max-w-sm">
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
