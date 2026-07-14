import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Blocked in production unless ALLOW_E2E_AUTH=true (set in CI only)
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_E2E_AUTH) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { email, password } = await request.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const responseCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: (cookies) => {
          for (const { name, value, options } of cookies) {
            responseCookies.push({ name, value, options })
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: error.message }, { status: 401 })

  const response = NextResponse.json({ ok: true })
  for (const { name, value, options } of responseCookies) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  }
  return response
}
