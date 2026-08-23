import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { demoRequestSchema } from '@/lib/demo-request';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = demoRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request' },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      '[demo-request] Supabase environment variables are not configured.'
    );

    return NextResponse.json(
      { error: 'not_configured' },
      { status: 503 }
    );
  }

  console.log('[demo-request] Supabase URL:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('demo_requests')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      phone: parsed.data.phone,
      message: parsed.data.message ?? null,
      status: 'new',
    });

  if (error) {
    console.error('[demo-request] Supabase insert failed:', error);

    return NextResponse.json(
      { error: 'delivery_failed' },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}