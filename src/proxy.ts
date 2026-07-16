import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/auth', '/api/cron', '/api/e2e-auth', '/api/health', '/terms', '/privacy']

// script-src uses a per-request nonce + 'strict-dynamic' instead of 'unsafe-inline'/'unsafe-eval',
// so an injected <script> tag can no longer execute even if it slips past other defenses.
// 'strict-dynamic' still allows Next.js's own chunk loader and libraries that inject scripts
// from already-trusted code (e.g. Vercel Analytics' document.createElement('script') call) to
// work, since trust propagates from the nonce'd bundle that creates them. style-src is left as
// 'unsafe-inline' — locking that down too would require auditing every inline style={} prop
// across the app and third-party components, a much bigger and separately-riskier change.
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.us.sentry.io",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Rate limit upload endpoint
  if (request.nextUrl.pathname.startsWith('/api/upload')) {
    const { data: { user } } = await supabase.auth.getUser()
    const identifier = user?.id ?? request.headers.get('x-forwarded-for') ?? 'anonymous'
    const { allowed } = await checkRateLimit(`upload:${identifier}`)
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  const { data: { user } } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === '/login') {
    // One extra query, only on the login-redirect path — not worth teaching
    // every request app-wide about vendor status (see the vendor portal
    // plan's routing section). A logged-in vendor lands on their portal by
    // default; the "switch to my personal account" link in /vendor/layout.tsx
    // covers the dual-persona case from there.
    const { data: vendorAccount } = await supabase
      .from('vendor_accounts')
      .select('id')
      .eq('auth_user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    const url = request.nextUrl.clone()
    url.pathname = vendorAccount ? '/vendor/dashboard' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Setting it on the request headers above only makes the nonce available to Next.js's
  // rendering pipeline — the response header below is what the browser actually enforces.
  supabaseResponse.headers.set('Content-Security-Policy', cspHeader)
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
