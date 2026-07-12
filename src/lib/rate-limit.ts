import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

function getRatelimit() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
    })
  }
  return ratelimit
}

export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
  const rl = getRatelimit()
  // Fail closed in production — never silently disable rate limiting
  if (!rl) {
    if (process.env.NODE_ENV === 'production') return { allowed: false, remaining: 0 }
    return { allowed: true, remaining: 999 }
  }

  const { success, remaining } = await rl.limit(identifier)
  return { allowed: success, remaining }
}
