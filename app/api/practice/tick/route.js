import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/isAdmin';
import { tick } from '@/lib/practice';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    return NextResponse.json(await tick());
  } catch {
    return NextResponse.json({ changed: false });
  }
}
