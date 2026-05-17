import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Ekip' };

export default function TeamPage({ params }: { params: { teamId: string } }) {
  redirect(`/teams/${params.teamId}/board`);
}
