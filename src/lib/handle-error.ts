import * as Sentry from '@sentry/nextjs'

const GENERIC_MESSAGE = 'Something went wrong. Please try again.'

export function handleActionError(e: unknown): { success: false; error: string } {
  Sentry.captureException(e)
  const message =
    process.env.NODE_ENV === 'development' && e instanceof Error
      ? e.message
      : GENERIC_MESSAGE
  return { success: false, error: message }
}
