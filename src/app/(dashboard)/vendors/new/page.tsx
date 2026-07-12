import Link from 'next/link'
import { VendorForm } from '@/components/vendors/VendorForm'
import { ChevronLeft } from 'lucide-react'

export const metadata = { title: 'New Vendor' }

export default function NewVendorPage() {
  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-2">
        <Link href="/vendors" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Add vendor</h1>
      </div>
      <VendorForm />
    </div>
  )
}
