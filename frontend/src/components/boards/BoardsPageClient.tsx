'use client';

import { useEffect, useState } from 'react';
import { LayoutPanelLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BoardSidebar } from '@/components/boards/BoardSidebar';
import { BoardPanel } from '@/components/boards/BoardPanel';
import { useBoards } from '@/hooks/useBoards';
import { useTeamMembers } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';

export function BoardsPageClient({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const { data: members } = useTeamMembers(teamId);
  const { data: boards, isLoading } = useBoards(teamId);

  const isAdmin = members?.find((member) => member.user_id === user?.id)?.role === 'admin';

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  // Keep a valid board selected: default to the first, and recover if the selected
  // board was deleted.
  useEffect(() => {
    if (!boards) return;
    setSelectedBoardId((current) => {
      if (current && boards.some((board) => board.id === current)) return current;
      return boards[0]?.id ?? null;
    });
  }, [boards]);

  if (isLoading) {
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

  const boardList = boards ?? [];
  const selectedBoard = boardList.find((board) => board.id === selectedBoardId) ?? null;

  if (boardList.length === 0) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row">
        <BoardSidebar
          boards={boardList}
          teamId={teamId}
          isAdmin={!!isAdmin}
          selectedBoardId={selectedBoardId}
          onSelect={setSelectedBoardId}
        />
        <div className="flex-1">
          <EmptyState
            icon={LayoutPanelLeft}
            title="Henüz pano yok"
            description={
              isAdmin
                ? 'Linkler, şifreler ve notlar için bir pano oluşturun.'
                : 'Ekip yöneticisi henüz bir pano oluşturmadı.'
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <BoardSidebar
        boards={boardList}
        teamId={teamId}
        isAdmin={!!isAdmin}
        selectedBoardId={selectedBoardId}
        onSelect={setSelectedBoardId}
      />
      <div className="min-w-0 flex-1">
        {selectedBoard && (
          <BoardPanel
            board={selectedBoard}
            teamId={teamId}
            isAdmin={!!isAdmin}
            onDeleted={() => setSelectedBoardId(null)}
          />
        )}
      </div>
    </div>
  );
}
