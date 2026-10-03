import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-screen px-6">
      <Compass className="text-primary-500 mb-4" size={56} />
      <h1 className="text-3xl font-bold text-gray-800">404</h1>
      <p className="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6">
        <Button variant="primary">Back to home</Button>
      </Link>
    </div>
  );
}
