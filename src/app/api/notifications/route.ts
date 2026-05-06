import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: return notifications
  return NextResponse.json({ notifications: [] });
}

export async function PATCH() {
  // TODO: mark as read
  return NextResponse.json({ success: true });
}
