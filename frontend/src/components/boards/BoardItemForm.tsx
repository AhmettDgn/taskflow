'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { boardItemSchema, type BoardItemValues } from '@/lib/validations/boards';
import type { BoardItem, BoardItemType } from '@/lib/types';

const TYPE_OPTIONS: { value: BoardItemType; label: string; placeholder: string }[] = [
  { value: 'link', label: 'Link', placeholder: 'https://...' },
  { value: 'password', label: 'Şifre', placeholder: 'Şifre değeri' },
  { value: 'note', label: 'Not', placeholder: 'Not içeriği...' },
];

interface BoardItemFormProps {
  item?: BoardItem;
  isPending?: boolean;
  onSubmit: (values: BoardItemValues) => Promise<void> | void;
  onCancel: () => void;
}

export function BoardItemForm({ item, isPending, onSubmit, onCancel }: BoardItemFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BoardItemValues>({
    resolver: zodResolver(boardItemSchema),
    defaultValues: {
      type: item?.type ?? 'link',
      label: item?.label ?? '',
      value: item?.value ?? '',
    },
  });

  const type = watch('type');
  const activeOption = TYPE_OPTIONS.find((option) => option.value === type) ?? TYPE_OPTIONS[0];

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  const fieldClass =
    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="item-type">Tür</Label>
          <select id="item-type" className={cn(fieldClass, 'h-10')} disabled={isPending} {...register('type')}>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-label">Etiket (opsiyonel)</Label>
          <Input id="item-label" placeholder="Örn: Figma" disabled={isPending} {...register('label')} />
          {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="item-value">{activeOption.label}</Label>
        {type === 'note' ? (
          <textarea
            id="item-value"
            rows={3}
            placeholder={activeOption.placeholder}
            disabled={isPending}
            className={cn(fieldClass, 'min-h-[4.5rem] resize-y')}
            {...register('value')}
          />
        ) : (
          <Input
            id="item-value"
            type={type === 'password' ? 'text' : 'text'}
            placeholder={activeOption.placeholder}
            disabled={isPending}
            {...register('value')}
          />
        )}
        {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          İptal
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {item ? 'Kaydet' : 'Ekle'}
        </Button>
      </div>
    </form>
  );
}
