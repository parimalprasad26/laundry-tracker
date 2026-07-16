import { listConnectedCustomers, listIncomingConnectionRequests } from '@/actions/vendor-portal'
import { ConnectedCustomersList } from '@/components/vendor-portal/ConnectedCustomersList'
import { PendingRequestsClient } from '@/components/vendor-portal/PendingRequestsClient'

export const metadata = { title: 'Vendor Dashboard' }

export default async function VendorDashboardPage() {
  const [customersResult, requestsResult] = await Promise.all([
    listConnectedCustomers(),
    listIncomingConnectionRequests(),
  ])

  const customers = customersResult.success ? customersResult.data : []
  const requests = requestsResult.success ? requestsResult.data : []

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Pending requests {requests.length > 0 && `(${requests.length})`}
        </h2>
        <PendingRequestsClient requests={requests} />
      </section>

      <section className="space-y-2.5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Connected customers {customers.length > 0 && `(${customers.length})`}
        </h2>
        <ConnectedCustomersList customers={customers} />
      </section>
    </div>
  )
}
