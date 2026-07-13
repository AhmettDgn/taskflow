import { Skeleton } from '@/components/ui/skeleton';

export default function ListLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="divide-y">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
