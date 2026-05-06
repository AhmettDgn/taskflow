import { NextResponse } from 'next/server';

export async function POST() {
  // TODO: implement auth actions (sign out, etc.)
  return NextResponse.json({ message: 'auth route' });
}
