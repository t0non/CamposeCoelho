import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session_id, mode, price_table_id, publish_products } = await request.json()

    if (!session_id || !mode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('confirm_catalog_import_session_atomic', {
      p_session_id: session_id,
      p_mode: mode,
      p_price_table_id: price_table_id || null,
      p_publish_products: !!publish_products
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error: unknown) {
    console.error('Confirm API Error:', error)
    const message = error instanceof Error ? error.message : 'Erro interno no servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
