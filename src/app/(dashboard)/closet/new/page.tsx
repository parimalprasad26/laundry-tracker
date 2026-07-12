import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ClosetUploadForm } from '@/components/closet/ClosetUploadForm'

export const metadata = { title: 'Add to Closet' }

export default function ClosetNewPage() {
  return (
    <div className="space-y-5 max-w-sm mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/closet" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold">Add to closet</h1>
      </div>
      <ClosetUploadForm />
    </div>
  )
}
