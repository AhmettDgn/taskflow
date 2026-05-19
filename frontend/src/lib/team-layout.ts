export async function loadTeamLayoutData(
  supabase: {
    from: (table: string) => {
      select: (value: string) => {
        eq: (column: string, lookup: string) => {
          single: () => Promise<{
            data: { id: string; name: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  },
  teamId: string
) {
  const { data: team, error } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .single();

  if (error || !team) {
    return { notFound: true as const };
  }

  return { notFound: false as const, team };
}
