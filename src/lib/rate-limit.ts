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
  if (!rl) {
    // TODO: fail closed here once Upstash is confirmed configured in every deploy
    // target and Sentry is wired up to alert on this branch — right now flipping
    // this to reject would risk silently breaking uploads if Upstash is ever
    // unset, with no error reporting in place yet to notice.
    return { allowed: true, remaining: 999 }
  }

  const { success, remaining } = await rl.limit(identifier)
  return { allowed: success, remaining }
}
