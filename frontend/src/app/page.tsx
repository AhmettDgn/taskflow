import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getRootRedirectPath } from '@/lib/auth-routing';
import { getPublicRedirectUrl } from '@/lib/public-origin';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(
    getPublicRedirectUrl(getRootRedirectPath(Boolean(user)), {
      headers: headers(),
    })
  );
}
