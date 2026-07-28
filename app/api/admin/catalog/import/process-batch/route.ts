import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session_id, batch_number } = await request.json()

    if (!session_id || batch_number === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('import_products_batch_atomic', {
      p_import_session_id: session_id,
      p_batch_number: batch_number
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error: unknown) {
    console.error('Process Batch API Error:', error)
    const message = error instanceof Error ? error.message : 'Erro interno no servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
