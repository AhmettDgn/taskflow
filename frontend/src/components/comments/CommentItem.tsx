'use client';

import { Trash2 } from 'lucide-react';
import type { Comment } from '@/lib/types';
import { useDeleteComment } from '@/hooks/useComments';
import { formatDate, getInitials } from '@/lib/utils';

interface CommentItemProps {
  comment: Comment;
  taskId: string;
  currentUserId?: string;
}

export function CommentItem({ comment, taskId, currentUserId }: CommentItemProps) {
  const { mutate: deleteComment, isPending } = useDeleteComment(taskId);
  const isOwn = comment.user_id === currentUserId;

  return (
    <div className="group flex gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {getInitials(comment.profiles?.full_name ?? null)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {comment.profiles?.full_name ?? 'Kullanıcı'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(comment.created_at)}
          </span>
          {isOwn && (
            <button
              onClick={() => deleteComment(comment.id)}
              disabled={isPending}
              className="ml-auto hidden text-muted-foreground hover:text-destructive group-hover:block disabled:opacity-50"
              aria-label="Yorumu sil"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
