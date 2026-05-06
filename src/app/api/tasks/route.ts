import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: return tasks
  return NextResponse.json({ tasks: [] });
}

export async function POST() {
  // TODO: create task
  return NextResponse.json({ task: null }, { status: 201 });
}
