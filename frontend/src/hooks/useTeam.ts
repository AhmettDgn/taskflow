'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiPath } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { getAuthContext } from '@/lib/supabase/auth-helpers';
import { QUERY_KEYS, STALE_TIME } from '@/lib/constants';
import type { Team, TeamMember } from '@/lib/types';

interface UseTeamsOptions {
  enabled?: boolean;
}

export function useTeams(options: UseTeamsOptions = {}) {
  const { enabled = true } = options;

  return useQuery<Team[]>({
    queryKey: [QUERY_KEYS.teams],
    queryFn: async () => {
      const { supabase, userId } = await getAuthContext();
      const { data, error } = await supabase
        .from('team_members')
        .select('teams(*)')
        .eq('user_id', userId);

      if (error) throw error;
      return (data ?? [])
        .map((row) => (row.teams as unknown as Team))
        .filter(Boolean);
    },
    staleTime: STALE_TIME,
    enabled,
  });
}

export function useTeam(teamId: string) {
  return useQuery<Team>({
    queryKey: [QUERY_KEYS.team, teamId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (error) throw error;
      return data as Team;
    },
    staleTime: STALE_TIME,
    enabled: !!teamId,
  });
}

export function useTeamMembers(teamId: string) {
  return useQuery<TeamMember[]>({
    queryKey: [QUERY_KEYS.members, teamId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('team_members')
        .select('*, profiles(*)')
        .eq('team_id', teamId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    staleTime: STALE_TIME,
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(getApiPath('/teams'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ekip oluşturulamadı');
      return json.team as Team;
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.teams] });
      toast.success(`"${team.name}" ekibi oluşturuldu!`);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Ekip oluşturulamadı');
    },
  });
}

export function useJoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await fetch(getApiPath('/teams/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ekibe katılınamadı');
      return json.team as Pick<Team, 'id' | 'name'>;
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.teams] });
      toast.success(`"${team.name}" ekibine katıldınız!`);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Ekibe katılınamadı');
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, teamId }: { memberId: string; teamId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      return { teamId };
    },
    onSuccess: ({ teamId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.members, teamId] });
      toast.success('Üye ekipten çıkarıldı');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Üye çıkarılamadı');
    },
  });
}

export function useInviteByEmail(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(getApiPath(`/teams/${teamId}/invite`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Davet gönderilemedi');
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.members, teamId] });
      toast.success(data.message ?? 'Kullanıcı eklendi');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
