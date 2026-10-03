import EmptyState from '@/components/ui/EmptyState';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title?: string }) {
  return (
    <div className="max-w-3xl mx-auto">
      <EmptyState
        icon={<Construction size={48} />}
        title={title ?? 'Coming soon'}
        description="This module is part of an upcoming feature release."
      />
    </div>
  );
}
