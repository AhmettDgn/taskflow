'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createBoardSchema, type CreateBoardValues } from '@/lib/validations/boards';

interface BoardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-filled name for rename mode; empty string for create mode. */
  initialName?: string;
  title: string;
  submitLabel: string;
  isPending?: boolean;
  onSubmit: (name: string) => Promise<void> | void;
}

export function BoardFormDialog({
  open,
  onOpenChange,
  initialName = '',
  title,
  submitLabel,
  isPending,
  onSubmit,
}: BoardFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBoardValues>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { name: initialName },
  });

  // Sync the form when the dialog opens (e.g. switching between boards to rename).
  useEffect(() => {
    if (open) reset({ name: initialName });
  }, [open, initialName, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values.name.trim());
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !isPending && onOpenChange(value)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-name">Pano Adı</Label>
            <Input
              id="board-name"
              placeholder="Örn: Önemli Linkler"
              disabled={isPending}
              autoFocus
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
