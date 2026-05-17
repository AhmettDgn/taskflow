'use client';

import { useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useComments, useAddComment, useRealtimeComments } from '@/hooks/useComments';
import { CommentItem } from './CommentItem';

interface CommentSectionProps {
  taskId: string;
}

export function CommentSection({ taskId }: CommentSectionProps) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useComments(taskId);
  const { mutateAsync: addComment, isPending } = useAddComment(taskId);
  useRealtimeComments(taskId);

  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    await addComment(content);
    setContent('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">
        Yorumlar {comments ? `(${comments.length})` : ''}
      </h3>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && comments?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Henüz yorum yok. İlk yorumu siz yapın.
        </p>
      )}

      {!isLoading && comments && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              taskId={taskId}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Yorum ekleyin... (Ctrl+Enter ile gönderin)"
          rows={2}
          disabled={isPending}
          className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isPending || !content.trim()}
          className="self-end h-9 w-9 flex-shrink-0"
        >
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </Button>
      </form>
    </div>
  );
}
