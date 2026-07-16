import { listMyRatecard, getMyVendorAccount } from '@/actions/vendor-portal'
import { RateCardClient } from '@/components/vendor-portal/RateCardClient'

export const metadata = { title: 'Rate Card' }

export default async function VendorPricesPage() {
  const [pricesResult, accountResult] = await Promise.all([listMyRatecard(), getMyVendorAccount()])
  const prices = pricesResult.success ? pricesResult.data : []
  const onboardingComplete = accountResult.success && accountResult.data.onboarding_completed_at != null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Rate card</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This price list is shared across every connected customer — set it once, it applies to everyone.
        </p>
      </div>
      <RateCardClient prices={prices} onboardingComplete={onboardingComplete} />
    </div>
  )
}
