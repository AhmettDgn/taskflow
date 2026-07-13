'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from './client';

interface AuthContext {
  supabase: SupabaseClient;
  userId: string;
}

/**
 * Returns a single Supabase client plus the verified user ID.
 * Profile creation/backfill belongs to DB triggers and server-side admin routes.
 * Client-side reads should not try to upsert `profiles`, because RLS blocks inserts.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = createClient();

  // userId yalnızca sorgu scope'u için kullanılıyor; asıl yetkilendirme RLS'te.
  // getSession() lokaldir — getUser()'ın her sorgudan önce eklediği network turunu kaldırır.
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    throw new Error('Oturum acilmamis');
  }

  return { supabase, userId: session.user.id };
}
