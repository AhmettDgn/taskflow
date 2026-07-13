import { Skeleton } from '@/components/ui/skeleton';

export default function BoardsLoading() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Skeleton className="h-40 sm:w-56" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
