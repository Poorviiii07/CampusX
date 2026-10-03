export type SkeletonShape = 'card' | 'row' | 'avatar' | 'text';

export interface SkeletonProps {
  shape?: SkeletonShape;
  className?: string;
  count?: number;
}

function shapeClasses(shape: SkeletonShape): string {
  switch (shape) {
    case 'card':
      return 'h-32 w-full rounded-xl';
    case 'row':
      return 'h-14 w-full rounded-lg';
    case 'avatar':
      return 'h-10 w-10 rounded-full';
    case 'text':
      return 'h-4 w-3/4 rounded';
  }
}

export function Skeleton({ shape = 'text', className = '', count = 1 }: SkeletonProps) {
  const base = shapeClasses(shape);
  if (count <= 1) {
    return <div className={`animate-pulse bg-gray-200 ${base} ${className}`} aria-hidden="true" />;
  }
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse bg-gray-200 ${base} ${className}`} />
      ))}
    </div>
  );
}

export default Skeleton;
