import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Ekip Ayarları' };

export default function TeamSettingsPage({ params }: { params: { teamId: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold" data-testid="team-settings-heading">Ekip Ayarları</h1>
      <p className="text-sm text-muted-foreground">Ekip: {params.teamId}</p>
    </div>
  );
}
