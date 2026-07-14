import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export default async function globalTeardown() {
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !user) {
    console.warn('⚠ teardown: sign-in failed, skipping cleanup')
    return
  }

  // Find all e2e test batches (identified by name prefix)
  const { data: batches } = await supabase
    .from('laundry_batches')
    .select('id')
    .eq('user_id', user.id)
    .like('name', 'E2E Test%')

  if (!batches?.length) {
    console.log('✓ teardown: nothing to clean up')
    return
  }

  const batchIds = batches.map(b => b.id)

  // batch_items has no CASCADE so delete explicitly first
  await supabase.from('batch_items').delete().in('batch_id', batchIds)

  // Deleting batches cascades to disputes, swaps, and other dependent rows
  const { error: batchErr } = await supabase
    .from('laundry_batches')
    .delete()
    .in('id', batchIds)

  if (batchErr) {
    console.warn('⚠ teardown: batch cleanup failed:', batchErr.message)
  } else {
    console.log(`✓ teardown: removed ${batchIds.length} e2e test batch(es)`)
  }
}
